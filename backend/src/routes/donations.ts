import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const paymentMethodSchema = z.enum(['cash', 'check', 'card', 'online', 'other'])

const createDonationSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().max(100).nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  fundId: z.string().nullable().optional(),
  method: paymentMethodSchema,
  receivedAt: z.string(),
  note: z.string().max(500).nullable().optional(),
})

const updateDonationSchema = createDonationSchema.partial()

// ============================================
// Routes
// ============================================

// GET /api/donations - List donations with filters
router.get('/', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const { dateFrom, dateTo, fundId, memberId } = req.query

    const where: Record<string, unknown> = {}

    // Date range filter
    if (dateFrom || dateTo) {
      where.receivedAt = {}
      if (dateFrom) {
        (where.receivedAt as Record<string, Date>).gte = new Date(dateFrom as string)
      }
      if (dateTo) {
        (where.receivedAt as Record<string, Date>).lte = new Date(dateTo as string)
      }
    }

    // Fund filter
    if (fundId) {
      where.fundId = fundId
    }

    // Member filter
    if (memberId) {
      where.memberId = memberId
    }

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
          fund: {
            select: { id: true, name: true },
          },
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.donation.count({ where }),
    ])

    res.json({
      donations: donations.map((d: typeof donations[0]) => ({
        ...d,
        receivedAt: d.receivedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    res.status(500).json({ error: 'Failed to fetch donations' })
  }
})

// GET /api/donations/:id - Get a single donation
router.get('/:id', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' })
    }

    res.json({
      ...donation,
      receivedAt: donation.receivedAt.toISOString(),
      createdAt: donation.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching donation:', error)
    res.status(500).json({ error: 'Failed to fetch donation' })
  }
})

// POST /api/donations - Create a new donation
router.post('/', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const parsed = createDonationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { memberId, guestName, amountCents, currency, fundId, method, receivedAt, note } = parsed.data

    // Validate member exists if provided
    if (memberId) {
      const member = await prisma.member.findUnique({ where: { id: memberId } })
      if (!member) {
        return res.status(400).json({ error: 'Member not found' })
      }
    }

    // Validate fund exists if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found' })
      }
    }

    const donation = await prisma.donation.create({
      data: {
        memberId: memberId ?? null,
        guestName: guestName ?? null,
        amountCents,
        currency: currency ?? 'USD',
        fundId: fundId ?? null,
        method,
        receivedAt: new Date(receivedAt),
        note: note ?? null,
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'CREATE_DONATION',
        entityType: 'Donation',
        entityId: donation.id,
        metadata: { amountCents, method },
      },
    })

    res.status(201).json({
      ...donation,
      receivedAt: donation.receivedAt.toISOString(),
      createdAt: donation.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating donation:', error)
    res.status(500).json({ error: 'Failed to create donation' })
  }
})

// PUT /api/donations/:id - Update a donation
router.put('/:id', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const parsed = updateDonationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.donation.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Donation not found' })
    }

    const { memberId, guestName, amountCents, currency, fundId, method, receivedAt, note } = parsed.data

    // Validate member exists if provided
    if (memberId) {
      const member = await prisma.member.findUnique({ where: { id: memberId } })
      if (!member) {
        return res.status(400).json({ error: 'Member not found' })
      }
    }

    // Validate fund exists if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found' })
      }
    }

    const donation = await prisma.donation.update({
      where: { id: req.params.id },
      data: {
        ...(memberId !== undefined && { memberId }),
        ...(guestName !== undefined && { guestName }),
        ...(amountCents !== undefined && { amountCents }),
        ...(currency !== undefined && { currency }),
        ...(fundId !== undefined && { fundId }),
        ...(method !== undefined && { method }),
        ...(receivedAt !== undefined && { receivedAt: new Date(receivedAt) }),
        ...(note !== undefined && { note }),
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'UPDATE_DONATION',
        entityType: 'Donation',
        entityId: donation.id,
        metadata: { changes: parsed.data },
      },
    })

    res.json({
      ...donation,
      receivedAt: donation.receivedAt.toISOString(),
      createdAt: donation.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating donation:', error)
    res.status(500).json({ error: 'Failed to update donation' })
  }
})

// DELETE /api/donations/:id - Delete a donation
router.delete('/:id', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const donation = await prisma.donation.findUnique({ where: { id: req.params.id } })
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' })
    }

    await prisma.donation.delete({ where: { id: req.params.id } })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'DELETE_DONATION',
        entityType: 'Donation',
        entityId: req.params.id,
        metadata: { amountCents: donation.amountCents },
      },
    })

    res.json({ message: 'Donation deleted successfully' })
  } catch (error) {
    console.error('Error deleting donation:', error)
    res.status(500).json({ error: 'Failed to delete donation' })
  }
})

export default router
