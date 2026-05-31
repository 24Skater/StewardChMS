import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas (mirrored from shared/src/schemas/schedules.ts)
// ============================================

const CreateMinistryCalendarSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ministryId: z.string().cuid(),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).default(2),
  serviceDayOfWeek: z.number().int().min(0).max(6).default(0),
})

const UpdateMinistryCalendarSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).optional(),
  serviceDayOfWeek: z.number().int().min(0).max(6).optional(),
})

const UpdateRotationSchema = z.object({
  memberIds: z.array(z.string().cuid()).min(1),
})

// ============================================
// Helper
// ============================================

function generateShareToken(): string {
  return randomBytes(32).toString('hex')
}

// ============================================
// GET /api/ministry-calendars — List all active calendars
// ============================================

router.get('/', requireAuth, requirePermission('schedules.view'), async (_req: Request, res: Response) => {
  try {
    const calendars = await prisma.ministryCalendar.findMany({
      where: { isActive: true },
      include: {
        ministry: { select: { id: true, name: true } },
        createdBy: { select: { id: true } },
        _count: { select: { rotationMembers: true } },
      },
      orderBy: { name: 'asc' },
    })

    res.json({
      success: true,
      data: calendars.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        ministryId: c.ministryId,
        ministry: c.ministry,
        reminderDaysBeforeSlot: c.reminderDaysBeforeSlot,
        serviceDayOfWeek: c.serviceDayOfWeek,
        rotationNextIndex: c.rotationNextIndex,
        rotationMemberCount: c._count.rotationMembers,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error listing ministry calendars:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/ministry-calendars — Create calendar
// ============================================

router.post('/', requireAuth, requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const parseResult = CreateMinistryCalendarSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
      return
    }

    const data = parseResult.data
    const shareToken = generateShareToken()

    const calendar = await prisma.ministryCalendar.create({
      data: {
        name: data.name,
        description: data.description,
        ministryId: data.ministryId,
        shareToken,
        reminderDaysBeforeSlot: data.reminderDaysBeforeSlot,
        serviceDayOfWeek: data.serviceDayOfWeek,
        createdById: req.user!.userId,
      },
      include: {
        ministry: { select: { id: true, name: true } },
      },
    })

    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'ministry_calendar.created',
      entityType: 'MinistryCalendar',
      entityId: calendar.id,
      metadata: { name: calendar.name },
    })

    res.status(201).json({
      success: true,
      data: {
        id: calendar.id,
        name: calendar.name,
        description: calendar.description,
        ministryId: calendar.ministryId,
        ministry: calendar.ministry,
        shareToken: calendar.shareToken,
        reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
        serviceDayOfWeek: calendar.serviceDayOfWeek,
        rotationNextIndex: calendar.rotationNextIndex,
        isActive: calendar.isActive,
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating ministry calendar:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/ministry-calendars/:id — Get calendar with rotation list
// ============================================

router.get('/:id', requireAuth, requirePermission('schedules.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const calendar = await prisma.ministryCalendar.findUnique({
      where: { id },
      include: {
        ministry: { select: { id: true, name: true } },
        rotationMembers: {
          include: {
            member: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { rotationOrder: 'asc' },
        },
      },
    })

    if (!calendar) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    res.json({
      success: true,
      data: {
        id: calendar.id,
        name: calendar.name,
        description: calendar.description,
        ministryId: calendar.ministryId,
        ministry: calendar.ministry,
        shareToken: calendar.shareToken,
        reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
        serviceDayOfWeek: calendar.serviceDayOfWeek,
        rotationNextIndex: calendar.rotationNextIndex,
        isActive: calendar.isActive,
        rotationMembers: calendar.rotationMembers.map(rm => ({
          id: rm.id,
          memberId: rm.memberId,
          rotationOrder: rm.rotationOrder,
          member: rm.member,
        })),
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching ministry calendar:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/ministry-calendars/:id — Update calendar
// ============================================

router.put('/:id', requireAuth, requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = UpdateMinistryCalendarSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
      return
    }

    const existing = await prisma.ministryCalendar.findUnique({ where: { id, isActive: true } })
    if (!existing) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    const calendar = await prisma.ministryCalendar.update({
      where: { id },
      data: parseResult.data,
      include: {
        ministry: { select: { id: true, name: true } },
        rotationMembers: {
          include: {
            member: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { rotationOrder: 'asc' },
        },
      },
    })

    res.json({
      success: true,
      data: {
        id: calendar.id,
        name: calendar.name,
        description: calendar.description,
        ministryId: calendar.ministryId,
        ministry: calendar.ministry,
        shareToken: calendar.shareToken,
        reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
        serviceDayOfWeek: calendar.serviceDayOfWeek,
        rotationNextIndex: calendar.rotationNextIndex,
        isActive: calendar.isActive,
        rotationMembers: calendar.rotationMembers.map(rm => ({
          id: rm.id,
          memberId: rm.memberId,
          rotationOrder: rm.rotationOrder,
          member: rm.member,
        })),
        createdAt: calendar.createdAt.toISOString(),
        updatedAt: calendar.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating ministry calendar:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/ministry-calendars/:id — Soft-delete calendar
// ============================================

router.delete('/:id', requireAuth, requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.ministryCalendar.findUnique({ where: { id, isActive: true } })
    if (!existing) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    await prisma.ministryCalendar.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'ministry_calendar.deleted',
      entityType: 'MinistryCalendar',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.json({ success: true, message: 'Ministry calendar deactivated' })
  } catch (error) {
    console.error('Error deleting ministry calendar:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/ministry-calendars/:id/rotation — Replace full rotation list
// ============================================

router.put('/:id/rotation', requireAuth, requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = UpdateRotationSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
      return
    }

    const existing = await prisma.ministryCalendar.findUnique({ where: { id, isActive: true } })
    if (!existing) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    const { memberIds } = parseResult.data

    // Replace rotation list in a transaction
    await prisma.$transaction([
      prisma.calendarRotationMember.deleteMany({ where: { calendarId: id } }),
      prisma.calendarRotationMember.createMany({
        data: memberIds.map((memberId, index) => ({
          calendarId: id,
          memberId,
          rotationOrder: index,
        })),
      }),
      prisma.ministryCalendar.update({
        where: { id },
        data: { rotationNextIndex: 0 },
      }),
    ])

    // Fetch the updated calendar with rotation
    const calendar = await prisma.ministryCalendar.findUnique({
      where: { id },
      include: {
        rotationMembers: {
          include: {
            member: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { rotationOrder: 'asc' },
        },
      },
    })

    if (!calendar) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    res.json({
      success: true,
      data: {
        id: calendar.id,
        rotationNextIndex: calendar.rotationNextIndex,
        rotationMembers: calendar.rotationMembers.map(rm => ({
          id: rm.id,
          memberId: rm.memberId,
          rotationOrder: rm.rotationOrder,
          member: rm.member,
        })),
      },
    })
  } catch (error) {
    console.error('Error updating rotation:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/ministry-calendars/:id/token/regenerate — Rotate share token
// ============================================

router.post('/:id/token/regenerate', requireAuth, requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.ministryCalendar.findUnique({ where: { id, isActive: true } })
    if (!existing) {
      res.status(404).json({ error: 'Ministry calendar not found' })
      return
    }

    const newToken = generateShareToken()

    await prisma.ministryCalendar.update({
      where: { id },
      data: { shareToken: newToken },
    })

    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'ministry_calendar.token_regenerated',
      entityType: 'MinistryCalendar',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.json({
      success: true,
      data: { shareToken: newToken },
    })
  } catch (error) {
    console.error('Error regenerating share token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
