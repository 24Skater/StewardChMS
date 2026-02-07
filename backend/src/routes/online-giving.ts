import { Router, Request, Response } from 'express'
import { z } from 'zod'
import Stripe from 'stripe'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// Initialize Stripe lazily to allow for runtime configuration
let stripe: Stripe | null = null

function getStripe(): Stripe | null {
  if (stripe) return stripe
  
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  
  stripe = new Stripe(secretKey, {
    typescript: true,
  })
  return stripe
}

// ============================================
// Schemas
// ============================================

const createPaymentIntentSchema = z.object({
  amountCents: z.number().int().min(100, 'Minimum donation is $1.00'),
  fundId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  memberId: z.string().optional(),
  note: z.string().optional(),
})

// ============================================
// Public Routes (No auth required for donors)
// ============================================

/**
 * GET /api/online-giving/config
 * Get public configuration for the giving page
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    // Get public Stripe key from settings
    const stripePublicKey = await prisma.setting.findUnique({
      where: { category_key: { category: 'stripe', key: 'public_key' } },
    })
    
    const givingEnabled = await prisma.setting.findUnique({
      where: { category_key: { category: 'giving', key: 'online_enabled' } },
    })

    const churchName = await prisma.setting.findUnique({
      where: { category_key: { category: 'branding', key: 'church_name' } },
    })

    // Get active funds that accept online giving
    const funds = await prisma.fund.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json({
      stripePublicKey: stripePublicKey?.value || null,
      givingEnabled: givingEnabled?.value === true,
      churchName: churchName?.value || 'Church',
      funds,
    })
  } catch (error) {
    console.error('Get giving config error:', error)
    res.status(500).json({ error: 'Failed to get giving configuration' })
  }
})

/**
 * POST /api/online-giving/create-payment-intent
 * Create a Stripe PaymentIntent for a donation
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const stripeInstance = getStripe()
    if (!stripeInstance) {
      res.status(503).json({ error: 'Online giving is not configured' })
      return
    }

    const parseResult = createPaymentIntentSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { amountCents, fundId, email, name, memberId, note } = parseResult.data

    // Validate fund if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund || !fund.isActive) {
        res.status(400).json({ error: 'Invalid fund selected' })
        return
      }
    }

    // Validate member if provided
    if (memberId) {
      const member = await prisma.member.findUnique({ where: { id: memberId } })
      if (!member) {
        res.status(400).json({ error: 'Invalid member ID' })
        return
      }
    }

    // Get church name for description
    const churchNameSetting = await prisma.setting.findUnique({
      where: { category_key: { category: 'branding', key: 'church_name' } },
    })
    const churchName = (churchNameSetting?.value as string) || 'Church'

    // Get fund name for description
    let fundName = 'General'
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      fundName = fund?.name || 'General'
    }

    // Create PaymentIntent
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      description: `Donation to ${churchName} - ${fundName}`,
      metadata: {
        fundId: fundId || '',
        memberId: memberId || '',
        donorName: name || '',
        donorEmail: email || '',
        note: note || '',
      },
      receipt_email: email || undefined,
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Create payment intent error:', error)
    if (error instanceof Stripe.errors.StripeError) {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Failed to create payment' })
    }
  }
})

/**
 * POST /api/online-giving/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const stripeInstance = getStripe()
  if (!stripeInstance) {
    res.status(503).json({ error: 'Stripe not configured' })
    return
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured')
    res.status(500).json({ error: 'Webhook not configured' })
    return
  }

  const sig = req.headers['stripe-signature'] as string
  if (!sig) {
    res.status(400).json({ error: 'Missing Stripe signature' })
    return
  }

  let event: Stripe.Event

  try {
    // Note: req.body should be raw for signature verification
    // This requires special middleware configuration
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', errorMessage)
    res.status(400).json({ error: `Webhook Error: ${errorMessage}` })
    return
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await handlePaymentSuccess(paymentIntent)
      break
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('Payment failed:', paymentIntent.id)
      // Update donation status if exists
      await prisma.donation.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: { stripeStatus: 'failed' },
      })
      break
    }
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // Check if donation already exists
  const existing = await prisma.donation.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  })
  
  if (existing) {
    // Update status
    await prisma.donation.update({
      where: { id: existing.id },
      data: {
        stripeStatus: paymentIntent.status,
        stripeChargeId: paymentIntent.latest_charge as string || null,
      },
    })
    return
  }

  // Create new donation record
  const metadata = paymentIntent.metadata
  const fundId = metadata.fundId || null
  const memberId = metadata.memberId || null
  const donorName = metadata.donorName || null
  const donorEmail = metadata.donorEmail || null
  const note = metadata.note || null

  await prisma.donation.create({
    data: {
      amountCents: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      fundId: fundId || undefined,
      memberId: memberId || undefined,
      guestName: !memberId ? donorName : null,
      guestEmail: !memberId ? donorEmail : null,
      method: 'online',
      receivedAt: new Date(),
      note,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.latest_charge as string || null,
      stripeStatus: paymentIntent.status,
      isOnline: true,
    },
  })
}

// ============================================
// Admin Routes (Auth required)
// ============================================

/**
 * GET /api/online-giving/stats
 * Get online giving statistics
 */
router.get('/stats', requireAuth, requirePermission('giving.view'), async (_req: Request, res: Response) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Total online donations this month
    const monthlyOnline = await prisma.donation.aggregate({
      where: {
        isOnline: true,
        receivedAt: { gte: startOfMonth },
        stripeStatus: 'succeeded',
      },
      _sum: { amountCents: true },
      _count: true,
    })

    // Total online donations this year
    const yearlyOnline = await prisma.donation.aggregate({
      where: {
        isOnline: true,
        receivedAt: { gte: startOfYear },
        stripeStatus: 'succeeded',
      },
      _sum: { amountCents: true },
      _count: true,
    })

    // Recent online donations
    const recentDonations = await prisma.donation.findMany({
      where: {
        isOnline: true,
        stripeStatus: 'succeeded',
      },
      orderBy: { receivedAt: 'desc' },
      take: 10,
      include: {
        member: {
          select: { firstName: true, lastName: true },
        },
        fund: {
          select: { name: true },
        },
      },
    })

    res.json({
      monthlyTotal: monthlyOnline._sum.amountCents || 0,
      monthlyCount: monthlyOnline._count,
      yearlyTotal: yearlyOnline._sum.amountCents || 0,
      yearlyCount: yearlyOnline._count,
      recentDonations: recentDonations.map((d: typeof recentDonations[0]) => ({
        id: d.id,
        amountCents: d.amountCents,
        receivedAt: d.receivedAt,
        donorName: d.member 
          ? `${d.member.firstName} ${d.member.lastName}`
          : d.guestName || 'Anonymous',
        fundName: d.fund?.name || 'General',
      })),
    })
  } catch (error) {
    console.error('Get online giving stats error:', error)
    res.status(500).json({ error: 'Failed to get statistics' })
  }
})

export default router

