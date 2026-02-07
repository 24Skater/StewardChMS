import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const occurrenceStatusSchema = z.enum(['scheduled', 'canceled'])

const updateOccurrenceSchema = z.object({
  startsAt: z.string().optional(),
  endsAt: z.string().nullable().optional(),
  status: occurrenceStatusSchema.optional(),
  notes: z.string().nullable().optional(),
})

const occurrenceSearchParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  eventId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

// ============================================
// Helper: Format occurrence response
// ============================================

function formatOccurrenceResponse(occurrence: {
  id: string
  eventId: string
  startsAt: Date
  endsAt: Date | null
  status: string
  notes: string | null
  event?: {
    id: string
    title: string
    description: string | null
    location: string | null
    category: string | null
  }
}) {
  return {
    id: occurrence.id,
    eventId: occurrence.eventId,
    startsAt: occurrence.startsAt.toISOString(),
    endsAt: occurrence.endsAt?.toISOString() ?? null,
    status: occurrence.status,
    notes: occurrence.notes,
    event: occurrence.event ? {
      id: occurrence.event.id,
      title: occurrence.event.title,
      description: occurrence.event.description,
      location: occurrence.event.location,
      category: occurrence.event.category,
    } : undefined,
  }
}

// ============================================
// GET /api/occurrences - List occurrences
// ============================================

router.get('/', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const parseResult = occurrenceSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { dateFrom, dateTo, eventId, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where: {
      eventId?: string
      startsAt?: { gte?: Date; lte?: Date }
    } = {}

    if (eventId) {
      where.eventId = eventId
    }

    if (dateFrom || dateTo) {
      where.startsAt = {}
      if (dateFrom) where.startsAt.gte = new Date(dateFrom)
      if (dateTo) where.startsAt.lte = new Date(dateTo)
    }

    const [occurrences, total] = await Promise.all([
      prisma.eventOccurrence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              category: true,
            },
          },
        },
      }),
      prisma.eventOccurrence.count({ where }),
    ])

    res.json({
      occurrences: occurrences.map(formatOccurrenceResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List occurrences error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/occurrences/:id - Get single occurrence
// ============================================

router.get('/:id', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            category: true,
          },
        },
        registrations: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        checkIns: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { checkedInAt: 'desc' },
        },
        worshipPlan: {
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
        },
      },
    })

    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    res.json({
      ...formatOccurrenceResponse(occurrence),
      registrations: occurrence.registrations.map((reg: typeof occurrence.registrations[0]) => ({
        id: reg.id,
        memberId: reg.memberId,
        guestName: reg.guestName,
        guestEmail: reg.guestEmail,
        guestPhone: reg.guestPhone,
        partySize: reg.partySize,
        status: reg.status,
        createdAt: reg.createdAt.toISOString(),
        member: reg.member,
      })),
      checkIns: occurrence.checkIns.map((ci: typeof occurrence.checkIns[0]) => ({
        id: ci.id,
        memberId: ci.memberId,
        guestName: ci.guestName,
        checkedInAt: ci.checkedInAt.toISOString(),
        method: ci.method,
        member: ci.member,
      })),
      worshipPlan: occurrence.worshipPlan ? {
        id: occurrence.worshipPlan.id,
        title: occurrence.worshipPlan.title,
        notes: occurrence.worshipPlan.notes,
        createdAt: occurrence.worshipPlan.createdAt.toISOString(),
        updatedAt: occurrence.worshipPlan.updatedAt.toISOString(),
        items: occurrence.worshipPlan.items.map((item: typeof occurrence.worshipPlan.items[0]) => ({
          id: item.id,
          sortOrder: item.sortOrder,
          itemType: item.itemType,
          title: item.title,
          details: item.details,
          songId: item.songId,
          assignedMemberId: item.assignedMemberId,
          durationMinutes: item.durationMinutes,
          song: item.song,
          assignedMember: item.assignedMember,
        })),
      } : null,
    })
  } catch (error) {
    console.error('Get occurrence error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/occurrences/:id - Update occurrence
// ============================================

router.put('/:id', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.eventOccurrence.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const parseResult = updateOccurrenceSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const occurrence = await prisma.eventOccurrence.update({
      where: { id },
      data: {
        ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt ? new Date(data.endsAt) : null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            category: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'OCCURRENCE_UPDATED',
        entityType: 'EventOccurrence',
        entityId: occurrence.id,
        metadata: { changes: Object.keys(data) },
      },
    })

    res.json(formatOccurrenceResponse(occurrence))
  } catch (error) {
    console.error('Update occurrence error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

