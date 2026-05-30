import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'
import { getEmailProvider } from '../providers/messaging/index.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const createPeriodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  autoGenerate: z.boolean().optional().default(false),
})

function getDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = []
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    if (date.getDay() === dayOfWeek) {
      dates.push(new Date(date))
    }
    date.setDate(date.getDate() + 1)
  }
  return dates
}

// ============================================
// GET /api/ministry-calendars/:calendarId/periods
// ============================================
router.get('/', requirePermission('schedules.view'), async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params

    const calendar = await prisma.ministryCalendar.findUnique({ where: { id: calendarId } })
    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const periods = await prisma.schedulePeriod.findMany({
      where: { calendarId },
      include: { _count: { select: { slots: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    res.json(periods.map(p => ({
      id: p.id,
      calendarId: p.calendarId,
      year: p.year,
      month: p.month,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
    })))
  } catch (error) {
    console.error('List periods error:', error)
    res.status(500).json({ error: 'Failed to list periods' })
  }
})

// ============================================
// POST /api/ministry-calendars/:calendarId/periods
// ============================================
router.post('/', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params
    const data = createPeriodSchema.parse(req.body)

    const calendar = await prisma.ministryCalendar.findUnique({
      where: { id: calendarId },
      include: {
        rotationMembers: { orderBy: { rotationOrder: 'asc' } },
      },
    })
    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const existing = await prisma.schedulePeriod.findUnique({
      where: { calendarId_year_month: { calendarId, year: data.year, month: data.month } },
    })
    if (existing) {
      return res.status(409).json({ error: 'A period for this month already exists' })
    }

    let nextIndex = calendar.rotationNextIndex
    const rotationSize = calendar.rotationMembers.length

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.schedulePeriod.create({
        data: { calendarId, year: data.year, month: data.month },
      })

      if (data.autoGenerate && rotationSize > 0) {
        const dates = getDatesForDayOfWeek(data.year, data.month, calendar.serviceDayOfWeek)
        for (const slotDate of dates) {
          const member = calendar.rotationMembers[nextIndex % rotationSize]
          const slot = await tx.scheduleSlot.create({
            data: { periodId: created.id, slotDate },
          })
          await tx.slotAssignment.create({
            data: {
              slotId: slot.id,
              memberId: member.memberId,
              assignedById: req.user?.userId ?? '',
            },
          })
          nextIndex++
        }
        await tx.ministryCalendar.update({
          where: { id: calendarId },
          data: { rotationNextIndex: nextIndex % rotationSize },
        })
      }

      return created
    })

    res.status(201).json({
      id: period.id,
      calendarId: period.calendarId,
      year: period.year,
      month: period.month,
      status: period.status,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Create period error:', error)
    res.status(500).json({ error: 'Failed to create period' })
  }
})

// ============================================
// GET /api/ministry-calendars/:calendarId/periods/:id
// Includes lazy duty reminder check
// ============================================
router.get('/:id', requirePermission('schedules.view'), async (req: Request, res: Response) => {
  try {
    const { calendarId, id } = req.params

    const calendar = await prisma.ministryCalendar.findUnique({ where: { id: calendarId } })
    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const period = await prisma.schedulePeriod.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            assignment: {
              include: {
                member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
              },
            },
          },
          orderBy: [{ slotDate: 'asc' }, { label: 'asc' }],
        },
      },
    })

    if (!period || period.calendarId !== calendarId) {
      return res.status(404).json({ error: 'Period not found' })
    }

    // Lazy reminder check
    if (period.status === 'PUBLISHED') {
      const reminderCutoff = new Date()
      reminderCutoff.setDate(reminderCutoff.getDate() + calendar.reminderDaysBeforeSlot)

      for (const slot of period.slots) {
        if (slot.assignment && !slot.assignment.reminderSentAt && slot.slotDate <= reminderCutoff) {
          const member = slot.assignment.member
          if (member.email) {
            await getEmailProvider().send(
              member.email,
              'Upcoming duty reminder',
              `Reminder: you are scheduled for ${slot.label ?? 'your duty'} in ${calendar.reminderDaysBeforeSlot} day(s) at your church.`,
            )
          }
          await prisma.slotAssignment.update({
            where: { id: slot.assignment.id },
            data: { reminderSentAt: new Date() },
          })
        }
      }
    }

    res.json({
      id: period.id,
      calendarId: period.calendarId,
      year: period.year,
      month: period.month,
      status: period.status,
      slots: period.slots.map(s => ({
        id: s.id,
        slotDate: s.slotDate.toISOString(),
        label: s.label,
        assignment: s.assignment ? {
          id: s.assignment.id,
          memberId: s.assignment.memberId,
          member: s.assignment.member,
          notes: s.assignment.notes,
          notifiedAt: s.assignment.notifiedAt?.toISOString() ?? null,
          reminderSentAt: s.assignment.reminderSentAt?.toISOString() ?? null,
        } : null,
      })),
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Get period error:', error)
    res.status(500).json({ error: 'Failed to get period' })
  }
})

// ============================================
// POST /api/ministry-calendars/:calendarId/periods/:id/publish
// ============================================
router.post('/:id/publish', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { calendarId, id } = req.params
    const actorUserId = req.user?.userId

    const calendar = await prisma.ministryCalendar.findUnique({ where: { id: calendarId } })
    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Calendar not found' })
    }

    const period = await prisma.schedulePeriod.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            assignment: {
              include: {
                member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    })

    if (!period || period.calendarId !== calendarId) {
      return res.status(404).json({ error: 'Period not found' })
    }

    if (period.status === 'PUBLISHED') {
      return res.status(409).json({ error: 'Period is already published' })
    }

    await prisma.schedulePeriod.update({ where: { id }, data: { status: 'PUBLISHED' } })

    // Notify all unnotified assignments
    for (const slot of period.slots) {
      if (slot.assignment && !slot.assignment.notifiedAt) {
        const member = slot.assignment.member
        if (member.email) {
          await getEmailProvider().send(
            member.email,
            'You have been scheduled',
            `Hi ${member.firstName}, you are scheduled for ${slot.label ?? 'your duty'} on ${slot.slotDate.toDateString()} at your church.`,
          )
        }
        await prisma.slotAssignment.update({
          where: { id: slot.assignment.id },
          data: { notifiedAt: new Date() },
        })
      }
    }

    await createAuditLog({
      actorUserId,
      action: 'PERIOD_PUBLISHED',
      entityType: 'SchedulePeriod',
      entityId: id,
      metadata: { calendarId, year: period.year, month: period.month },
    })

    res.json({ id, status: 'PUBLISHED' })
  } catch (error) {
    console.error('Publish period error:', error)
    res.status(500).json({ error: 'Failed to publish period' })
  }
})

// ============================================
// DELETE /api/ministry-calendars/:calendarId/periods/:id
// ============================================
router.delete('/:id', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { calendarId, id } = req.params

    const period = await prisma.schedulePeriod.findUnique({ where: { id } })
    if (!period || period.calendarId !== calendarId) {
      return res.status(404).json({ error: 'Period not found' })
    }

    if (period.status === 'PUBLISHED') {
      return res.status(409).json({ error: 'Cannot delete a published period' })
    }

    await prisma.schedulePeriod.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error('Delete period error:', error)
    res.status(500).json({ error: 'Failed to delete period' })
  }
})

export default router
