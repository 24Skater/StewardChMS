import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const pledgeStatusSchema = z.enum(['active', 'completed', 'canceled'])

const createPledgeSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  fundId: z.string().nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: pledgeStatusSchema.optional().default('active'),
})

const updatePledgeSchema = createPledgeSchema.partial()

// ============================================
// Routes
// ============================================

// GET /api/pledges - List pledges with filters
router.get('/', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const { status, memberId, fundId } = req.query

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (memberId) {
      where.memberId = memberId
    }

    if (fundId) {
      where.fundId = fundId
    }

    const [pledges, total] = await Promise.all([
      prisma.pledge.findMany({
        where,
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
          fund: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pledge.count({ where }),
    ])

    res.json({
      pledges: pledges.map((p: typeof pledges[0]) => ({
        ...p,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching pledges:', error)
    res.status(500).json({ error: 'Failed to fetch pledges' })
  }
})

// GET /api/pledges/:id - Get a single pledge
router.get('/:id', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const pledge = await prisma.pledge.findUnique({
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

    if (!pledge) {
      return res.status(404).json({ error: 'Pledge not found' })
    }

    res.json({
      ...pledge,
      startDate: pledge.startDate?.toISOString() ?? null,
      endDate: pledge.endDate?.toISOString() ?? null,
      createdAt: pledge.createdAt.toISOString(),
      updatedAt: pledge.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching pledge:', error)
    res.status(500).json({ error: 'Failed to fetch pledge' })
  }
})

// POST /api/pledges - Create a new pledge
router.post('/', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const parsed = createPledgeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { memberId, fundId, amountCents, startDate, endDate, status } = parsed.data

    // Validate member exists
    const member = await prisma.member.findUnique({ where: { id: memberId } })
    if (!member) {
      return res.status(400).json({ error: 'Member not found' })
    }

    // Validate fund exists if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found' })
      }
    }

    const pledge = await prisma.pledge.create({
      data: {
        orgId: requireOrgId(),
        memberId,
        fundId: fundId ?? null,
        amountCents,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status ?? 'active',
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
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'CREATE_PLEDGE',
      entityType: 'Pledge',
      entityId: pledge.id,
      metadata: { memberId, amountCents },
    })

    res.status(201).json({
      ...pledge,
      startDate: pledge.startDate?.toISOString() ?? null,
      endDate: pledge.endDate?.toISOString() ?? null,
      createdAt: pledge.createdAt.toISOString(),
      updatedAt: pledge.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating pledge:', error)
    res.status(500).json({ error: 'Failed to create pledge' })
  }
})

// PUT /api/pledges/:id - Update a pledge
router.put('/:id', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const parsed = updatePledgeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.pledge.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Pledge not found' })
    }

    const { memberId, fundId, amountCents, startDate, endDate, status } = parsed.data

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

    const pledge = await prisma.pledge.update({
      where: { id: req.params.id },
      data: {
        ...(memberId !== undefined && { memberId }),
        ...(fundId !== undefined && { fundId }),
        ...(amountCents !== undefined && { amountCents }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
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
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'UPDATE_PLEDGE',
      entityType: 'Pledge',
      entityId: pledge.id,
      metadata: { changes: parsed.data },
    })

    res.json({
      ...pledge,
      startDate: pledge.startDate?.toISOString() ?? null,
      endDate: pledge.endDate?.toISOString() ?? null,
      createdAt: pledge.createdAt.toISOString(),
      updatedAt: pledge.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating pledge:', error)
    res.status(500).json({ error: 'Failed to update pledge' })
  }
})

// DELETE /api/pledges/:id - Delete a pledge
router.delete('/:id', requireAuth, requirePermission('giving.edit'), async (req, res) => {
  try {
    const pledge = await prisma.pledge.findUnique({ where: { id: req.params.id } })
    if (!pledge) {
      return res.status(404).json({ error: 'Pledge not found' })
    }

    await prisma.pledge.delete({ where: { id: req.params.id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'DELETE_PLEDGE',
      entityType: 'Pledge',
      entityId: req.params.id,
      metadata: { amountCents: pledge.amountCents },
    })

    res.json({ message: 'Pledge deleted successfully' })
  } catch (error) {
    console.error('Error deleting pledge:', error)
    res.status(500).json({ error: 'Failed to delete pledge' })
  }
})

export default router
