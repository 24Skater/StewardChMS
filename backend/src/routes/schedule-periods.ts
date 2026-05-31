import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'
import { getEmailProvider } from '../providers/messaging/index.js'

const router = Router({ mergeParams: true })

// ============================================
// Zod Schemas
// ============================================

const CreateSchedulePeriodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  autoGenerate: z.boolean().default(false),
})

// ============================================
// Helper: Find all dates in a month matching a day of week
// ============================================

function findDatesInMonth(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = []
  const date = new Date(year, month - 1, 1) // month is 1-indexed
  while (date.getMonth() === month - 1) {
    if (date.getDay() === dayOfWeek) {
      dates.push(new Date(date))
    }
    date.setDate(date.getDate() + 1)
  }
  return dates
}

// ============================================
// GET /api/ministry-calendars/:calendarId/periods — List periods
// ============================================

router.get(
  '/',
  requireAuth,
  requirePermission('schedules.view'),
  async (req: Request, res: Response) => {
    try {
      const { calendarId } = req.params

      const calendar = await prisma.ministryCalendar.findUnique({
        where: { id: calendarId, isActive: true },
      })
      if (!calendar) {
        res.status(404).json({ error: 'Ministry calendar not found' })
        return
      }

      const periods = await prisma.schedulePeriod.findMany({
        where: { calendarId },
        include: {
          _count: { select: { slots: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })

      res.json({
        success: true,
        data: periods.map(p => ({
          id: p.id,
          calendarId: p.calendarId,
          year: p.year,
          month: p.month,
          status: p.status,
          slotCount: p._count.slots,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      })
    } catch (error) {
      console.error('Error listing schedule periods:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// POST /api/ministry-calendars/:calendarId/periods — Create draft period
// ============================================

router.post(
  '/',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { calendarId } = req.params

      const parseResult = CreateSchedulePeriodSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
        return
      }

      const { year, month, autoGenerate } = parseResult.data

      const calendar = await prisma.ministryCalendar.findUnique({
        where: { id: calendarId, isActive: true },
      })
      if (!calendar) {
        res.status(404).json({ error: 'Ministry calendar not found' })
        return
      }

      // Check for duplicate period
      const existing = await prisma.schedulePeriod.findUnique({
        where: { calendarId_year_month: { calendarId, year, month } },
      })
      if (existing) {
        res.status(409).json({ error: 'A schedule period for this month already exists' })
        return
      }

      // Build slot dates if autoGenerate is requested
      const slotDates = autoGenerate
        ? findDatesInMonth(year, month, calendar.serviceDayOfWeek)
        : []

      // Create the period and slots in a transaction
      const period = await prisma.$transaction(async tx => {
        const newPeriod = await tx.schedulePeriod.create({
          data: {
            calendarId,
            year,
            month,
            status: 'DRAFT',
          },
        })

        if (slotDates.length > 0) {
          await tx.scheduleSlot.createMany({
            data: slotDates.map(slotDate => ({
              periodId: newPeriod.id,
              slotDate,
            })),
          })

          // Advance calendar rotation index by number of slots created
          await tx.ministryCalendar.update({
            where: { id: calendarId },
            data: {
              rotationNextIndex: {
                increment: slotDates.length,
              },
            },
          })
        }

        return newPeriod
      })

      await createAuditLog({
        actorUserId: req.user?.userId,
        action: 'schedule_period.created',
        entityType: 'SchedulePeriod',
        entityId: period.id,
        metadata: { calendarId, year, month, autoGenerate, slotCount: slotDates.length },
      })

      res.status(201).json({
        success: true,
        data: {
          id: period.id,
          calendarId: period.calendarId,
          year: period.year,
          month: period.month,
          status: period.status,
          slotCount: slotDates.length,
          createdAt: period.createdAt.toISOString(),
          updatedAt: period.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error creating schedule period:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// GET /api/ministry-calendars/:calendarId/periods/:id — Get period with slots/assignments
// ============================================

router.get(
  '/:id',
  requireAuth,
  requirePermission('schedules.view'),
  async (req: Request, res: Response) => {
    try {
      const { calendarId, id } = req.params

      const calendar = await prisma.ministryCalendar.findUnique({
        where: { id: calendarId, isActive: true },
      })
      if (!calendar) {
        res.status(404).json({ error: 'Ministry calendar not found' })
        return
      }

      const period = await prisma.schedulePeriod.findUnique({
        where: { id },
        include: {
          slots: {
            include: {
              assignment: {
                include: {
                  member: { select: { id: true, firstName: true, lastName: true, email: true } },
                  assignedBy: { select: { id: true } },
                },
              },
            },
            orderBy: { slotDate: 'asc' },
          },
        },
      })

      if (!period || period.calendarId !== calendarId) {
        res.status(404).json({ error: 'Schedule period not found' })
        return
      }

      // Lazy reminder check: send reminders for due assignments
      const now = new Date()
      const emailProvider = getEmailProvider()
      const stampedAssignmentIds = new Set<string>()

      for (const slot of period.slots) {
        const assignment = slot.assignment
        if (!assignment || assignment.reminderSentAt !== null) continue

        const reminderThreshold = new Date(slot.slotDate)
        reminderThreshold.setDate(
          reminderThreshold.getDate() - calendar.reminderDaysBeforeSlot
        )

        if (now >= reminderThreshold) {
          const memberEmail = assignment.member.email
          if (memberEmail) {
            await emailProvider.send(
              memberEmail,
              'Upcoming service reminder',
              `Hi ${assignment.member.firstName}, this is a reminder that you are scheduled to serve on ${slot.slotDate.toDateString()}.`
            )
          }

          await prisma.slotAssignment.update({
            where: { id: assignment.id },
            data: { reminderSentAt: new Date() },
          })

          // Track stamped IDs without mutating the Prisma object
          stampedAssignmentIds.add(assignment.id)
        }
      }

      res.json({
        success: true,
        data: {
          id: period.id,
          calendarId: period.calendarId,
          year: period.year,
          month: period.month,
          status: period.status,
          slots: period.slots.map(slot => ({
            id: slot.id,
            periodId: slot.periodId,
            slotDate: slot.slotDate.toISOString(),
            label: slot.label,
            eventOccurrenceId: slot.eventOccurrenceId,
            assignment: slot.assignment
              ? {
                  id: slot.assignment.id,
                  memberId: slot.assignment.memberId,
                  member: slot.assignment.member,
                  assignedById: slot.assignment.assignedById,
                  notifiedAt: slot.assignment.notifiedAt?.toISOString() ?? null,
                  reminderSentAt: stampedAssignmentIds.has(slot.assignment.id)
                    ? now.toISOString()
                    : (slot.assignment.reminderSentAt?.toISOString() ?? null),
                  notes: slot.assignment.notes,
                  createdAt: slot.assignment.createdAt.toISOString(),
                  updatedAt: slot.assignment.updatedAt.toISOString(),
                }
              : null,
            createdAt: slot.createdAt.toISOString(),
            updatedAt: slot.updatedAt.toISOString(),
          })),
          createdAt: period.createdAt.toISOString(),
          updatedAt: period.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error fetching schedule period:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// POST /api/ministry-calendars/:calendarId/periods/:id/publish — Publish period
// ============================================

router.post(
  '/:id/publish',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { calendarId, id } = req.params

      const calendar = await prisma.ministryCalendar.findUnique({
        where: { id: calendarId, isActive: true },
      })
      if (!calendar) {
        res.status(404).json({ error: 'Ministry calendar not found' })
        return
      }

      const period = await prisma.schedulePeriod.findUnique({
        where: { id },
        include: {
          slots: {
            include: {
              assignment: {
                include: {
                  member: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
              },
            },
          },
        },
      })

      if (!period || period.calendarId !== calendarId) {
        res.status(404).json({ error: 'Schedule period not found' })
        return
      }

      if (period.status === 'PUBLISHED') {
        res.status(409).json({ error: 'Schedule period is already published' })
        return
      }

      // Collect assignments that need notification stamps
      const assignmentsToNotify = period.slots
        .map(slot => slot.assignment)
        .filter((a): a is NonNullable<typeof a> => a !== null && a.notifiedAt === null)

      const notifiedAt = new Date()

      // Atomically mark the period as published and stamp all notifiedAt fields
      const updatedPeriod = await prisma.$transaction(async tx => {
        const published = await tx.schedulePeriod.update({
          where: { id },
          data: { status: 'PUBLISHED' },
        })

        await Promise.all(
          assignmentsToNotify.map(a =>
            tx.slotAssignment.update({
              where: { id: a.id },
              data: { notifiedAt },
            })
          )
        )

        return published
      })

      // Send notifications AFTER the transaction commits (external side effect)
      const emailProvider = getEmailProvider()

      for (const slot of period.slots) {
        const assignment = slot.assignment
        if (!assignment || assignment.notifiedAt !== null) continue

        const memberEmail = assignment.member.email
        if (memberEmail) {
          await emailProvider.send(
            memberEmail,
            'You have been scheduled to serve',
            `Hi ${assignment.member.firstName}, you have been scheduled to serve on ${slot.slotDate.toDateString()}.`
          )
        }
      }

      await createAuditLog({
        actorUserId: req.user?.userId,
        action: 'schedule_period.published',
        entityType: 'SchedulePeriod',
        entityId: id,
        metadata: { calendarId, year: period.year, month: period.month },
      })

      res.json({
        success: true,
        data: {
          id: updatedPeriod.id,
          calendarId: updatedPeriod.calendarId,
          year: updatedPeriod.year,
          month: updatedPeriod.month,
          status: updatedPeriod.status,
          createdAt: updatedPeriod.createdAt.toISOString(),
          updatedAt: updatedPeriod.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error publishing schedule period:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// DELETE /api/ministry-calendars/:calendarId/periods/:id — Delete draft period only
// ============================================

router.delete(
  '/:id',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { calendarId, id } = req.params

      const calendar = await prisma.ministryCalendar.findUnique({
        where: { id: calendarId, isActive: true },
      })
      if (!calendar) {
        res.status(404).json({ error: 'Ministry calendar not found' })
        return
      }

      const period = await prisma.schedulePeriod.findUnique({
        where: { id },
      })

      if (!period || period.calendarId !== calendarId) {
        res.status(404).json({ error: 'Schedule period not found' })
        return
      }

      if (period.status === 'PUBLISHED') {
        res.status(409).json({ error: 'Cannot delete published period' })
        return
      }

      await prisma.schedulePeriod.delete({ where: { id } })

      await createAuditLog({
        actorUserId: req.user?.userId,
        action: 'schedule_period.deleted',
        entityType: 'SchedulePeriod',
        entityId: id,
        metadata: { calendarId, year: period.year, month: period.month },
      })

      res.json({ success: true, message: 'Schedule period deleted' })
    } catch (error) {
      console.error('Error deleting schedule period:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
