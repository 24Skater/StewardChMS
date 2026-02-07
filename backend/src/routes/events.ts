import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const recurrenceRuleSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6),
  weekOfMonth: z.number().min(1).max(5).optional(),
})

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  ministryId: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional(),
  startDatetime: z.string().nullable().optional(),
  endDatetime: z.string().nullable().optional(),
})

const updateEventSchema = createEventSchema.partial()

const eventSearchParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

const generateOccurrencesSchema = z.object({
  daysAhead: z.number().int().positive().max(365).optional().default(90),
})

// ============================================
// Helper: Format event response
// ============================================

function formatEventResponse(event: {
  id: string
  title: string
  description: string | null
  location: string | null
  category: string | null
  ministryId: string | null
  isRecurring: boolean
  recurrenceRule: string | null
  startDatetime: Date | null
  endDatetime: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    category: event.category,
    ministryId: event.ministryId,
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule,
    startDatetime: event.startDatetime?.toISOString() ?? null,
    endDatetime: event.endDatetime?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

// ============================================
// Helper: Generate occurrence dates
// ============================================

function generateOccurrenceDates(
  recurrenceRule: string,
  startDate: Date,
  daysAhead: number
): Date[] {
  const dates: Date[] = []
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + daysAhead)

  let rule: z.infer<typeof recurrenceRuleSchema>
  try {
    rule = recurrenceRuleSchema.parse(JSON.parse(recurrenceRule))
  } catch {
    return dates
  }

  const current = new Date(startDate)
  
  if (rule.frequency === 'weekly') {
    // Find the first occurrence on the specified day of week
    while (current.getDay() !== rule.dayOfWeek) {
      current.setDate(current.getDate() + 1)
    }
    
    // Generate weekly occurrences
    while (current <= endDate) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 7)
    }
  } else if (rule.frequency === 'monthly' && rule.weekOfMonth) {
    // Monthly on Nth weekday (e.g., 1st Monday)
    current.setDate(1) // Start at beginning of month
    
    while (current <= endDate) {
      // Find the Nth occurrence of dayOfWeek in this month
      const year = current.getFullYear()
      const month = current.getMonth()
      
      let count = 0
      const check = new Date(year, month, 1)
      
      while (check.getMonth() === month) {
        if (check.getDay() === rule.dayOfWeek) {
          count++
          if (count === rule.weekOfMonth) {
            if (check >= startDate && check <= endDate) {
              dates.push(new Date(check))
            }
            break
          }
        }
        check.setDate(check.getDate() + 1)
      }
      
      // Move to next month
      current.setMonth(current.getMonth() + 1)
      current.setDate(1)
    }
  }

  return dates
}

// ============================================
// POST /api/events - Create event
// ============================================

router.post('/', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const parseResult = createEventSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Validate recurrence rule if provided
    if (data.recurrenceRule) {
      try {
        recurrenceRuleSchema.parse(JSON.parse(data.recurrenceRule))
      } catch {
        res.status(400).json({ error: 'Invalid recurrence rule format' })
        return
      }
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        location: data.location ?? null,
        category: data.category ?? null,
        ministryId: data.ministryId ?? null,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule ?? null,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : null,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : null,
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      metadata: { title: event.title },
    })

    res.status(201).json(formatEventResponse(event))
  } catch (error) {
    console.error('Create event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/events - List events
// ============================================

router.get('/', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const parseResult = eventSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { dateFrom, dateTo, category, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where: {
      category?: string
      startDatetime?: { gte?: Date; lte?: Date }
    } = {}

    if (category) {
      where.category = category
    }

    if (dateFrom || dateTo) {
      where.startDatetime = {}
      if (dateFrom) where.startDatetime.gte = new Date(dateFrom)
      if (dateTo) where.startDatetime.lte = new Date(dateTo)
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.count({ where }),
    ])

    res.json({
      events: events.map(formatEventResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List events error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/events/:id - Get single event
// ============================================

router.get('/:id', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        occurrences: {
          orderBy: { startsAt: 'asc' },
          take: 50,
        },
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    res.json({
      ...formatEventResponse(event),
      occurrences: event.occurrences.map((occ: typeof event.occurrences[0]) => ({
        id: occ.id,
        startsAt: occ.startsAt.toISOString(),
        endsAt: occ.endsAt?.toISOString() ?? null,
        status: occ.status,
        notes: occ.notes,
      })),
    })
  } catch (error) {
    console.error('Get event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/events/:id - Update event
// ============================================

router.put('/:id', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    const parseResult = updateEventSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Validate recurrence rule if provided
    if (data.recurrenceRule) {
      try {
        recurrenceRuleSchema.parse(JSON.parse(data.recurrenceRule))
      } catch {
        res.status(400).json({ error: 'Invalid recurrence rule format' })
        return
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.location !== undefined && { location: data.location ?? null }),
        ...(data.category !== undefined && { category: data.category ?? null }),
        ...(data.ministryId !== undefined && { ministryId: data.ministryId ?? null }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.recurrenceRule !== undefined && { recurrenceRule: data.recurrenceRule ?? null }),
        ...(data.startDatetime !== undefined && { startDatetime: data.startDatetime ? new Date(data.startDatetime) : null }),
        ...(data.endDatetime !== undefined && { endDatetime: data.endDatetime ? new Date(data.endDatetime) : null }),
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'EVENT_UPDATED',
      entityType: 'Event',
      entityId: event.id,
      metadata: { changes: Object.keys(data) },
    })

    res.json(formatEventResponse(event))
  } catch (error) {
    console.error('Update event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/events/:id - Delete event
// ============================================

router.delete('/:id', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.event.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    await prisma.event.delete({ where: { id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'EVENT_DELETED',
      entityType: 'Event',
      entityId: id,
      metadata: { title: existing.title },
    })

    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Delete event error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/events/:id/generate-occurrences
// ============================================

router.post('/:id/generate-occurrences', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    const parseResult = generateOccurrencesSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { daysAhead } = parseResult.data
    const startDate = new Date()
    let occurrencesToCreate: { startsAt: Date; endsAt: Date | null }[] = []

    if (event.isRecurring && event.recurrenceRule) {
      // Generate from recurrence rule
      const dates = generateOccurrenceDates(event.recurrenceRule, startDate, daysAhead)
      
      // Calculate duration if we have start and end times
      let durationMs = 0
      if (event.startDatetime && event.endDatetime) {
        durationMs = event.endDatetime.getTime() - event.startDatetime.getTime()
      }

      occurrencesToCreate = dates.map(date => {
        // If event has specific start time, use its time portion
        if (event.startDatetime) {
          date.setHours(
            event.startDatetime.getHours(),
            event.startDatetime.getMinutes(),
            event.startDatetime.getSeconds(),
            0 // Reset milliseconds to ensure consistent duplicate detection
          )
        } else {
          // No start time - normalize to midnight
          date.setHours(0, 0, 0, 0)
        }
        
        return {
          startsAt: date,
          endsAt: durationMs > 0 ? new Date(date.getTime() + durationMs) : null,
        }
      })
    } else if (event.startDatetime) {
      // Non-recurring: create single occurrence if in future
      if (event.startDatetime >= startDate) {
        occurrencesToCreate = [{
          startsAt: event.startDatetime,
          endsAt: event.endDatetime,
        }]
      }
    }

    // Create occurrences, skipping duplicates
    let created = 0
    let skipped = 0

    for (const occ of occurrencesToCreate) {
      try {
        await prisma.eventOccurrence.create({
          data: {
            eventId: id,
            startsAt: occ.startsAt,
            endsAt: occ.endsAt,
            status: 'scheduled',
          },
        })
        created++
      } catch (err: unknown) {
        // Skip duplicate (unique constraint violation)
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
          skipped++
        } else {
          throw err
        }
      }
    }

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'OCCURRENCES_GENERATED',
      entityType: 'Event',
      entityId: id,
      metadata: { created, skipped, daysAhead },
    })

    res.json({
      message: `Generated ${created} occurrences (${skipped} skipped as duplicates)`,
      created,
      skipped,
    })
  } catch (error) {
    console.error('Generate occurrences error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

