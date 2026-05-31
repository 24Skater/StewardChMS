import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'
import { getEmailProvider } from '../providers/messaging/index.js'

const router = Router()

// ============================================
// Zod Schemas (mirrored from shared/src/schemas/schedules.ts)
// ============================================

const CreateScheduleSlotSchema = z.object({
  periodId: z.string().cuid(),
  slotDate: z.string().datetime(),
  label: z.string().optional(),
  eventOccurrenceId: z.string().cuid().optional(),
})

const UpdateScheduleSlotSchema = z.object({
  slotDate: z.string().datetime().optional(),
  label: z.string().optional(),
  eventOccurrenceId: z.string().cuid().optional(),
})

const AssignSlotSchema = z.object({
  memberId: z.string().cuid(),
  notes: z.string().optional(),
})

// ============================================
// Types
// ============================================

interface ConflictInfo {
  calendarId: string
  calendarName: string
  slotDate: string
  label: string | null
}

// ============================================
// POST /api/schedule-slots — Add manual slot to a DRAFT period
// ============================================

router.post(
  '/',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const parseResult = CreateScheduleSlotSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
        return
      }

      const { periodId, slotDate, label, eventOccurrenceId } = parseResult.data

      const period = await prisma.schedulePeriod.findUnique({
        where: { id: periodId },
      })
      if (!period) {
        res.status(404).json({ error: 'Schedule period not found' })
        return
      }

      if (period.status !== 'DRAFT') {
        res.status(409).json({ error: 'Cannot add slots to a published period' })
        return
      }

      const slot = await prisma.scheduleSlot.create({
        data: {
          periodId,
          slotDate: new Date(slotDate),
          label,
          eventOccurrenceId,
        },
      })

      res.status(201).json({
        success: true,
        data: {
          id: slot.id,
          periodId: slot.periodId,
          slotDate: slot.slotDate.toISOString(),
          label: slot.label,
          eventOccurrenceId: slot.eventOccurrenceId,
          createdAt: slot.createdAt.toISOString(),
          updatedAt: slot.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error creating schedule slot:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// PUT /api/schedule-slots/:id — Update slot (DRAFT only)
// ============================================

router.put(
  '/:id',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      const parseResult = UpdateScheduleSlotSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
        return
      }

      const existing = await prisma.scheduleSlot.findUnique({
        where: { id },
        include: { period: true },
      })
      if (!existing) {
        res.status(404).json({ error: 'Schedule slot not found' })
        return
      }

      if (existing.period.status !== 'DRAFT') {
        res.status(409).json({ error: 'Cannot update slots in a published period' })
        return
      }

      const updateData: { slotDate?: Date; label?: string; eventOccurrenceId?: string } = {}
      if (parseResult.data.slotDate !== undefined) {
        updateData.slotDate = new Date(parseResult.data.slotDate)
      }
      if (parseResult.data.label !== undefined) {
        updateData.label = parseResult.data.label
      }
      if (parseResult.data.eventOccurrenceId !== undefined) {
        updateData.eventOccurrenceId = parseResult.data.eventOccurrenceId
      }

      const slot = await prisma.scheduleSlot.update({
        where: { id },
        data: updateData,
      })

      res.json({
        success: true,
        data: {
          id: slot.id,
          periodId: slot.periodId,
          slotDate: slot.slotDate.toISOString(),
          label: slot.label,
          eventOccurrenceId: slot.eventOccurrenceId,
          createdAt: slot.createdAt.toISOString(),
          updatedAt: slot.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error updating schedule slot:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// DELETE /api/schedule-slots/:id — Remove slot (DRAFT only)
// ============================================

router.delete(
  '/:id',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      const existing = await prisma.scheduleSlot.findUnique({
        where: { id },
        include: { period: true },
      })
      if (!existing) {
        res.status(404).json({ error: 'Schedule slot not found' })
        return
      }

      if (existing.period.status !== 'DRAFT') {
        res.status(409).json({ error: 'Cannot delete slots from a published period' })
        return
      }

      await prisma.scheduleSlot.delete({ where: { id } })

      res.json({ success: true, message: 'Schedule slot deleted' })
    } catch (error) {
      console.error('Error deleting schedule slot:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// POST /api/schedule-slots/:id/assign — Assign member to slot
// ============================================

router.post(
  '/:id/assign',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      const parseResult = AssignSlotSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() })
        return
      }

      const { memberId, notes } = parseResult.data

      const slot = await prisma.scheduleSlot.findUnique({
        where: { id },
        include: {
          assignment: true,
          period: {
            include: { calendar: true },
          },
        },
      })
      if (!slot) {
        res.status(404).json({ error: 'Schedule slot not found' })
        return
      }

      if (slot.assignment) {
        res.status(409).json({ error: 'Slot already has an assignment' })
        return
      }

      let assignmentNotifiedAt: Date | null = null

      const newAssignment = await prisma.slotAssignment.create({
        data: {
          slotId: id,
          memberId,
          assignedById: req.user!.userId,
          notes,
        },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedBy: { select: { id: true } },
        },
      })

      await createAuditLog({
        actorUserId: req.user?.userId,
        action: 'slot_assignment.created',
        entityType: 'SlotAssignment',
        entityId: newAssignment.id,
        metadata: { slotId: id, memberId, calendarId: slot.period.calendarId },
      })

      // Detect conflicts: other assignments for the same member on the same date
      const dayStart = new Date(slot.slotDate)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(slot.slotDate)
      dayEnd.setUTCHours(23, 59, 59, 999)

      const conflictRecords = await prisma.slotAssignment.findMany({
        where: {
          id: { not: newAssignment.id },
          memberId,
          slot: {
            slotDate: { gte: dayStart, lte: dayEnd },
          },
        },
        include: {
          slot: {
            include: {
              period: {
                include: {
                  calendar: true,
                },
              },
            },
          },
        },
      })

      const conflicts: ConflictInfo[] = conflictRecords.map(c => ({
        calendarId: c.slot.period.calendarId,
        calendarName: c.slot.period.calendar.name,
        slotDate: c.slot.slotDate.toISOString(),
        label: c.slot.label,
      }))

      // If the period is already published, send an immediate assignment notification
      if (slot.period.status === 'PUBLISHED') {
        const memberEmail = newAssignment.member.email
        if (memberEmail) {
          const emailProvider = getEmailProvider()
          await emailProvider.send(
            memberEmail,
            'You have been scheduled to serve',
            `Hi ${newAssignment.member.firstName}, you have been scheduled to serve on ${slot.slotDate.toDateString()}. Template: schedule.assigned`
          )
        }

        // Stamp notifiedAt
        assignmentNotifiedAt = new Date()
        await prisma.slotAssignment.update({
          where: { id: newAssignment.id },
          data: { notifiedAt: assignmentNotifiedAt },
        })
      }

      res.status(201).json({
        success: true,
        data: {
          assignment: {
            id: newAssignment.id,
            slotId: newAssignment.slotId,
            memberId: newAssignment.memberId,
            member: newAssignment.member,
            assignedById: newAssignment.assignedById,
            notes: newAssignment.notes,
            notifiedAt: assignmentNotifiedAt?.toISOString() ?? null,
            reminderSentAt: newAssignment.reminderSentAt?.toISOString() ?? null,
            createdAt: newAssignment.createdAt.toISOString(),
            updatedAt: newAssignment.updatedAt.toISOString(),
          },
          conflicts,
        },
      })
    } catch (error) {
      console.error('Error assigning slot:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// ============================================
// DELETE /api/schedule-slots/:id/assignment — Unassign member from slot
// ============================================

router.delete(
  '/:id/assignment',
  requireAuth,
  requirePermission('schedules.manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      const slot = await prisma.scheduleSlot.findUnique({
        where: { id },
        include: { assignment: true },
      })
      if (!slot) {
        res.status(404).json({ error: 'Schedule slot not found' })
        return
      }

      if (!slot.assignment) {
        res.status(404).json({ error: 'No assignment found for this slot' })
        return
      }

      const assignmentId = slot.assignment.id
      const memberId = slot.assignment.memberId

      await prisma.slotAssignment.delete({ where: { id: assignmentId } })

      await createAuditLog({
        actorUserId: req.user?.userId,
        action: 'slot_assignment.deleted',
        entityType: 'SlotAssignment',
        entityId: assignmentId,
        metadata: { slotId: id, memberId },
      })

      res.json({ success: true, message: 'Assignment removed' })
    } catch (error) {
      console.error('Error removing slot assignment:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
