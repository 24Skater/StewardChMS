import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const createCalendarSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  ministryId: z.string().min(1, 'Ministry is required'),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).optional().default(2),
  serviceDayOfWeek: z.number().int().min(0).max(6).optional().default(0),
})

const updateCalendarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  reminderDaysBeforeSlot: z.number().int().min(0).max(30).optional(),
  serviceDayOfWeek: z.number().int().min(0).max(6).optional(),
})

const updateRotationSchema = z.object({
  memberIds: z.array(z.string()).min(0),
})

function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// ============================================
// GET /api/ministry-calendars
// ============================================
router.get('/', requirePermission('schedules.view'), async (req: Request, res: Response) => {
  try {
    const calendars = await prisma.ministryCalendar.findMany({
      where: { isActive: true },
      include: {
        ministry: { select: { id: true, name: true } },
        _count: { select: { rotationMembers: true, periods: true } },
      },
      orderBy: [{ ministry: { name: 'asc' } }, { name: 'asc' }],
    })

    res.json(calendars.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      ministryId: c.ministryId,
      ministry: c.ministry,
      reminderDaysBeforeSlot: c.reminderDaysBeforeSlot,
      serviceDayOfWeek: c.serviceDayOfWeek,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      _count: c._count,
    })))
  } catch (error) {
    console.error('List calendars error:', error)
    res.status(500).json({ error: 'Failed to list ministry calendars' })
  }
})

// ============================================
// POST /api/ministry-calendars
// ============================================
router.post('/', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const data = createCalendarSchema.parse(req.body)
    const actorUserId = req.user?.userId

    const calendar = await prisma.ministryCalendar.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        ministryId: data.ministryId,
        shareToken: generateShareToken(),
        reminderDaysBeforeSlot: data.reminderDaysBeforeSlot,
        serviceDayOfWeek: data.serviceDayOfWeek,
        createdById: actorUserId!,
      },
      include: {
        ministry: { select: { id: true, name: true } },
      },
    })

    await createAuditLog({
      actorUserId,
      action: 'CALENDAR_CREATED',
      entityType: 'MinistryCalendar',
      entityId: calendar.id,
      metadata: { name: calendar.name },
    })

    res.status(201).json({
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      ministryId: calendar.ministryId,
      ministry: calendar.ministry,
      reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
      serviceDayOfWeek: calendar.serviceDayOfWeek,
      isActive: calendar.isActive,
      createdAt: calendar.createdAt.toISOString(),
      updatedAt: calendar.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Create calendar error:', error)
    res.status(500).json({ error: 'Failed to create ministry calendar' })
  }
})

// ============================================
// GET /api/ministry-calendars/:id
// ============================================
router.get('/:id', requirePermission('schedules.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actorUserId = req.user?.userId

    const calendar = await prisma.ministryCalendar.findUnique({
      where: { id },
      include: {
        ministry: { select: { id: true, name: true } },
        rotationMembers: {
          include: { member: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { rotationOrder: 'asc' },
        },
      },
    })

    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const userHasManage = await prisma.rolePermission.findFirst({
      where: {
        role: { userRoles: { some: { userId: actorUserId } } },
        permission: { key: 'schedules.manage' },
      },
    })

    res.json({
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      ministryId: calendar.ministryId,
      ministry: calendar.ministry,
      reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
      serviceDayOfWeek: calendar.serviceDayOfWeek,
      rotationNextIndex: calendar.rotationNextIndex,
      isActive: calendar.isActive,
      shareToken: userHasManage ? calendar.shareToken : undefined,
      rotationMembers: calendar.rotationMembers.map(rm => ({
        id: rm.id,
        memberId: rm.memberId,
        member: rm.member,
        rotationOrder: rm.rotationOrder,
      })),
      createdAt: calendar.createdAt.toISOString(),
      updatedAt: calendar.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Get calendar error:', error)
    res.status(500).json({ error: 'Failed to get ministry calendar' })
  }
})

// ============================================
// PUT /api/ministry-calendars/:id
// ============================================
router.put('/:id', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = updateCalendarSchema.parse(req.body)

    const existing = await prisma.ministryCalendar.findUnique({ where: { id } })
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const calendar = await prisma.ministryCalendar.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reminderDaysBeforeSlot !== undefined && { reminderDaysBeforeSlot: data.reminderDaysBeforeSlot }),
        ...(data.serviceDayOfWeek !== undefined && { serviceDayOfWeek: data.serviceDayOfWeek }),
      },
      include: { ministry: { select: { id: true, name: true } } },
    })

    res.json({
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      ministryId: calendar.ministryId,
      ministry: calendar.ministry,
      reminderDaysBeforeSlot: calendar.reminderDaysBeforeSlot,
      serviceDayOfWeek: calendar.serviceDayOfWeek,
      isActive: calendar.isActive,
      createdAt: calendar.createdAt.toISOString(),
      updatedAt: calendar.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Update calendar error:', error)
    res.status(500).json({ error: 'Failed to update ministry calendar' })
  }
})

// ============================================
// DELETE /api/ministry-calendars/:id  (soft delete)
// ============================================
router.delete('/:id', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actorUserId = req.user?.userId

    const existing = await prisma.ministryCalendar.findUnique({ where: { id } })
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    await prisma.ministryCalendar.update({ where: { id }, data: { isActive: false } })

    await createAuditLog({
      actorUserId,
      action: 'CALENDAR_DELETED',
      entityType: 'MinistryCalendar',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.status(204).send()
  } catch (error) {
    console.error('Delete calendar error:', error)
    res.status(500).json({ error: 'Failed to delete ministry calendar' })
  }
})

// ============================================
// PUT /api/ministry-calendars/:id/rotation
// ============================================
router.put('/:id/rotation', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { memberIds } = updateRotationSchema.parse(req.body)

    const existing = await prisma.ministryCalendar.findUnique({ where: { id } })
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.calendarRotationMember.deleteMany({ where: { calendarId: id } })
      await tx.ministryCalendar.update({ where: { id }, data: { rotationNextIndex: 0 } })
      if (memberIds.length > 0) {
        await tx.calendarRotationMember.createMany({
          data: memberIds.map((memberId, idx) => ({
            calendarId: id,
            memberId,
            rotationOrder: idx,
          })),
        })
      }
    })

    const updated = await prisma.ministryCalendar.findUnique({
      where: { id },
      include: {
        rotationMembers: {
          include: { member: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { rotationOrder: 'asc' },
        },
      },
    })

    res.json({
      rotationMembers: updated!.rotationMembers.map(rm => ({
        id: rm.id,
        memberId: rm.memberId,
        member: rm.member,
        rotationOrder: rm.rotationOrder,
      })),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Update rotation error:', error)
    res.status(500).json({ error: 'Failed to update rotation' })
  }
})

// ============================================
// POST /api/ministry-calendars/:id/token/regenerate
// ============================================
router.post('/:id/token/regenerate', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actorUserId = req.user?.userId

    const existing = await prisma.ministryCalendar.findUnique({ where: { id } })
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const newToken = generateShareToken()
    await prisma.ministryCalendar.update({ where: { id }, data: { shareToken: newToken } })

    await createAuditLog({
      actorUserId,
      action: 'CALENDAR_TOKEN_REGENERATED',
      entityType: 'MinistryCalendar',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.json({ shareToken: newToken })
  } catch (error) {
    console.error('Regenerate token error:', error)
    res.status(500).json({ error: 'Failed to regenerate share token' })
  }
})

export default router
