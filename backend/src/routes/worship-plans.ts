import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createWorshipPlanSchema = z.object({
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const updateWorshipPlanSchema = createWorshipPlanSchema

const itemTypeSchema = z.enum(['song', 'scripture', 'announcement', 'sermon', 'prayer', 'other'])

const createWorshipPlanItemSchema = z.object({
  sortOrder: z.number().int().min(0),
  itemType: itemTypeSchema,
  title: z.string().min(1, 'Title is required'),
  details: z.string().nullable().optional(),
  songId: z.string().nullable().optional(),
  assignedMemberId: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
})

const updateWorshipPlanItemSchema = createWorshipPlanItemSchema.partial()

const reorderWorshipPlanItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int().min(0),
  })),
})

// ============================================
// Helper: Format worship plan response
// ============================================

function formatWorshipPlanResponse(plan: {
  id: string
  eventOccurrenceId: string
  title: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  items?: Array<{
    id: string
    sortOrder: number
    itemType: string
    title: string
    details: string | null
    songId: string | null
    assignedMemberId: string | null
    durationMinutes: number | null
    song?: { id: string; title: string; artist: string | null; defaultKey: string | null } | null
    assignedMember?: { id: string; firstName: string; lastName: string } | null
  }>
}) {
  return {
    id: plan.id,
    eventOccurrenceId: plan.eventOccurrenceId,
    title: plan.title,
    notes: plan.notes,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    items: plan.items?.map(item => ({
      id: item.id,
      worshipPlanId: plan.id,
      sortOrder: item.sortOrder,
      itemType: item.itemType,
      title: item.title,
      details: item.details,
      songId: item.songId,
      assignedMemberId: item.assignedMemberId,
      durationMinutes: item.durationMinutes,
      song: item.song,
      assignedMember: item.assignedMember,
    })) ?? [],
  }
}

// ============================================
// POST /api/occurrences/:id/worship-plan - Create or upsert
// ============================================

router.post('/occurrences/:id/worship-plan', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const parseResult = createWorshipPlanSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Upsert - create if doesn't exist, update if does
    const plan = await prisma.worshipPlan.upsert({
      where: { eventOccurrenceId: occurrenceId },
      update: {
        title: data.title ?? null,
        notes: data.notes ?? null,
      },
      create: {
        orgId: requireOrgId(),
        eventOccurrenceId: occurrenceId,
        title: data.title ?? null,
        notes: data.notes ?? null,
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                defaultKey: true,
              },
            },
            assignedMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_UPSERTED',
      entityType: 'WorshipPlan',
      entityId: plan.id,
      metadata: { occurrenceId },
    })

    res.status(201).json(formatWorshipPlanResponse(plan))
  } catch (error) {
    console.error('Create/upsert worship plan error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/occurrences/:id/worship-plan
// ============================================

router.get('/occurrences/:id/worship-plan', requireAuth, requirePermission('worship.read'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const plan = await prisma.worshipPlan.findUnique({
      where: { eventOccurrenceId: occurrenceId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                defaultKey: true,
              },
            },
            assignedMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!plan) {
      res.status(404).json({ error: 'Worship plan not found for this occurrence' })
      return
    }

    res.json(formatWorshipPlanResponse(plan))
  } catch (error) {
    console.error('Get worship plan error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/worship-plans/:id
// ============================================

router.put('/worship-plans/:id', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.worshipPlan.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Worship plan not found' })
      return
    }

    const parseResult = updateWorshipPlanSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const plan = await prisma.worshipPlan.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title ?? null }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                defaultKey: true,
              },
            },
            assignedMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_UPDATED',
      entityType: 'WorshipPlan',
      entityId: plan.id,
      metadata: { changes: Object.keys(data) },
    })

    res.json(formatWorshipPlanResponse(plan))
  } catch (error) {
    console.error('Update worship plan error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/worship-plans/:id/items
// ============================================

router.post('/worship-plans/:id/items', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id: planId } = req.params

    const plan = await prisma.worshipPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      res.status(404).json({ error: 'Worship plan not found' })
      return
    }

    const parseResult = createWorshipPlanItemSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Verify song exists if provided
    if (data.songId) {
      const song = await prisma.song.findUnique({ where: { id: data.songId } })
      if (!song) {
        res.status(400).json({ error: 'Song not found' })
        return
      }
    }

    // Verify member exists if provided
    if (data.assignedMemberId) {
      const member = await prisma.member.findUnique({ where: { id: data.assignedMemberId } })
      if (!member) {
        res.status(400).json({ error: 'Member not found' })
        return
      }
    }

    const item = await prisma.worshipPlanItem.create({
      data: {
        orgId: requireOrgId(),
        worshipPlanId: planId,
        sortOrder: data.sortOrder,
        itemType: data.itemType,
        title: data.title,
        details: data.details ?? null,
        songId: data.songId ?? null,
        assignedMemberId: data.assignedMemberId ?? null,
        durationMinutes: data.durationMinutes ?? null,
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            artist: true,
            defaultKey: true,
          },
        },
        assignedMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_ITEM_CREATED',
      entityType: 'WorshipPlanItem',
      entityId: item.id,
      metadata: { planId, itemType: data.itemType, title: data.title },
    })

    res.status(201).json({
      id: item.id,
      worshipPlanId: item.worshipPlanId,
      sortOrder: item.sortOrder,
      itemType: item.itemType,
      title: item.title,
      details: item.details,
      songId: item.songId,
      assignedMemberId: item.assignedMemberId,
      durationMinutes: item.durationMinutes,
      song: item.song,
      assignedMember: item.assignedMember,
    })
  } catch (error) {
    console.error('Create worship plan item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/worship-plans/items/:itemId
// ============================================

router.put('/worship-plans/items/:itemId', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params

    const existing = await prisma.worshipPlanItem.findUnique({ where: { id: itemId } })
    if (!existing) {
      res.status(404).json({ error: 'Worship plan item not found' })
      return
    }

    const parseResult = updateWorshipPlanItemSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Verify song exists if provided
    if (data.songId) {
      const song = await prisma.song.findUnique({ where: { id: data.songId } })
      if (!song) {
        res.status(400).json({ error: 'Song not found' })
        return
      }
    }

    // Verify member exists if provided
    if (data.assignedMemberId) {
      const member = await prisma.member.findUnique({ where: { id: data.assignedMemberId } })
      if (!member) {
        res.status(400).json({ error: 'Member not found' })
        return
      }
    }

    const item = await prisma.worshipPlanItem.update({
      where: { id: itemId },
      data: {
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.itemType !== undefined && { itemType: data.itemType }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.details !== undefined && { details: data.details ?? null }),
        ...(data.songId !== undefined && { songId: data.songId ?? null }),
        ...(data.assignedMemberId !== undefined && { assignedMemberId: data.assignedMemberId ?? null }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes ?? null }),
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            artist: true,
            defaultKey: true,
          },
        },
        assignedMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_ITEM_UPDATED',
      entityType: 'WorshipPlanItem',
      entityId: item.id,
      metadata: { changes: Object.keys(data) },
    })

    res.json({
      id: item.id,
      worshipPlanId: item.worshipPlanId,
      sortOrder: item.sortOrder,
      itemType: item.itemType,
      title: item.title,
      details: item.details,
      songId: item.songId,
      assignedMemberId: item.assignedMemberId,
      durationMinutes: item.durationMinutes,
      song: item.song,
      assignedMember: item.assignedMember,
    })
  } catch (error) {
    console.error('Update worship plan item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/worship-plans/items/:itemId
// ============================================

router.delete('/worship-plans/items/:itemId', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params

    const existing = await prisma.worshipPlanItem.findUnique({ where: { id: itemId } })
    if (!existing) {
      res.status(404).json({ error: 'Worship plan item not found' })
      return
    }

    await prisma.worshipPlanItem.delete({ where: { id: itemId } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_ITEM_DELETED',
      entityType: 'WorshipPlanItem',
      entityId: itemId,
      metadata: { planId: existing.worshipPlanId, title: existing.title },
    })

    res.json({ message: 'Worship plan item deleted successfully' })
  } catch (error) {
    console.error('Delete worship plan item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/worship-plans/:id/reorder
// ============================================

router.put('/worship-plans/:id/reorder', requireAuth, requirePermission('worship.write'), async (req: Request, res: Response) => {
  try {
    const { id: planId } = req.params

    const plan = await prisma.worshipPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      res.status(404).json({ error: 'Worship plan not found' })
      return
    }

    const parseResult = reorderWorshipPlanItemsSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { items } = parseResult.data

    // Update all items in a transaction
    await prisma.$transaction(
      items.map(item =>
        prisma.worshipPlanItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    )

    // Fetch updated plan
    const updatedPlan = await prisma.worshipPlan.findUnique({
      where: { id: planId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                defaultKey: true,
              },
            },
            assignedMember: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'WORSHIP_PLAN_ITEMS_REORDERED',
      entityType: 'WorshipPlan',
      entityId: planId,
      metadata: { itemCount: items.length },
    })

    res.json(formatWorshipPlanResponse(updatedPlan!))
  } catch (error) {
    console.error('Reorder worship plan items error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

