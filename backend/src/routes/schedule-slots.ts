import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'
import { getEmailProvider } from '../providers/messaging/index.js'

const router = Router()

router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const createSlotSchema = z.object({
  periodId: z.string().min(1),
  slotDate: z.string().min(1),
  label: z.string().max(100).nullable().optional(),
  eventOccurrenceId: z.string().nullable().optional(),
})

const updateSlotSchema = z.object({
  slotDate: z.string().optional(),
  label: z.string().max(100).nullable().optional(),
  eventOccurrenceId: z.string().nullable().optional(),
})

const assignSlotSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  notes: z.string().max(500).nullable().optional(),
})

interface ConflictInfo {
  calendarId: string
  calendarName: string
  slotDate: string
  label: string | null
}

// ============================================
// POST /api/schedule-slots
// ============================================
router.post('/', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const data = createSlotSchema.parse(req.body)

    const period = await prisma.schedulePeriod.findUnique({ where: { id: data.periodId } })
    if (!period) {
      return res.status(404).json({ error: 'Period not found' })
    }
    if (period.status === 'PUBLISHED') {
      return res.status(409).json({ error: 'Cannot add slots to a published period' })
    }

    const slot = await prisma.scheduleSlot.create({
      data: {
        periodId: data.periodId,
        slotDate: new Date(data.slotDate),
        label: data.label ?? null,
        eventOccurrenceId: data.eventOccurrenceId ?? null,
      },
    })

    res.status(201).json({
      id: slot.id,
      periodId: slot.periodId,
      slotDate: slot.slotDate.toISOString(),
      label: slot.label,
      assignment: null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Create slot error:', error)
    res.status(500).json({ error: 'Failed to create slot' })
  }
})

// ============================================
// PUT /api/schedule-slots/:id
// ============================================
router.put('/:id', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = updateSlotSchema.parse(req.body)

    const slot = await prisma.scheduleSlot.findUnique({
      where: { id },
      include: { period: true },
    })
    if (!slot) return res.status(404).json({ error: 'Slot not found' })
    if (slot.period.status === 'PUBLISHED') {
      return res.status(409).json({ error: 'Cannot edit a slot in a published period' })
    }

    const updated = await prisma.scheduleSlot.update({
      where: { id },
      data: {
        ...(data.slotDate !== undefined && { slotDate: new Date(data.slotDate) }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.eventOccurrenceId !== undefined && { eventOccurrenceId: data.eventOccurrenceId }),
      },
    })

    res.json({
      id: updated.id,
      periodId: updated.periodId,
      slotDate: updated.slotDate.toISOString(),
      label: updated.label,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Update slot error:', error)
    res.status(500).json({ error: 'Failed to update slot' })
  }
})

// ============================================
// DELETE /api/schedule-slots/:id
// ============================================
router.delete('/:id', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const slot = await prisma.scheduleSlot.findUnique({
      where: { id },
      include: { period: true },
    })
    if (!slot) return res.status(404).json({ error: 'Slot not found' })
    if (slot.period.status === 'PUBLISHED') {
      return res.status(409).json({ error: 'Cannot delete a slot in a published period' })
    }

    await prisma.scheduleSlot.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    console.error('Delete slot error:', error)
    res.status(500).json({ error: 'Failed to delete slot' })
  }
})

// ============================================
// POST /api/schedule-slots/:id/assign
// ============================================
router.post('/:id/assign', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = assignSlotSchema.parse(req.body)
    const actorUserId = req.user?.userId

    const slot = await prisma.scheduleSlot.findUnique({
      where: { id },
      include: { period: { include: { calendar: true } } },
    })
    if (!slot) return res.status(404).json({ error: 'Slot not found' })

    // Remove existing assignment if any
    await prisma.slotAssignment.deleteMany({ where: { slotId: id } })

    const assignment = await prisma.slotAssignment.create({
      data: {
        slotId: id,
        memberId: data.memberId,
        assignedById: actorUserId!,
        notes: data.notes ?? null,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Conflict detection: same member on same date across all calendars
    const slotDateStart = new Date(slot.slotDate)
    slotDateStart.setHours(0, 0, 0, 0)
    const slotDateEnd = new Date(slot.slotDate)
    slotDateEnd.setHours(23, 59, 59, 999)

    const conflicts = await prisma.slotAssignment.findMany({
      where: {
        memberId: data.memberId,
        slotId: { not: id },
        slot: { slotDate: { gte: slotDateStart, lte: slotDateEnd } },
      },
      include: {
        slot: {
          include: {
            period: { include: { calendar: { select: { id: true, name: true } } } },
          },
        },
      },
    })

    const conflictInfo: ConflictInfo[] = conflicts.map(c => ({
      calendarId: c.slot.period.calendar.id,
      calendarName: c.slot.period.calendar.name,
      slotDate: c.slot.slotDate.toISOString(),
      label: c.slot.label,
    }))

    // If period is already published, notify immediately
    if (slot.period.status === 'PUBLISHED' && assignment.member.email) {
      await getEmailProvider().send(
        assignment.member.email,
        'You have been scheduled',
        `Hi ${assignment.member.firstName}, you are scheduled for ${slot.label ?? 'your duty'} on ${slot.slotDate.toDateString()} at your church.`,
      )
      await prisma.slotAssignment.update({
        where: { id: assignment.id },
        data: { notifiedAt: new Date() },
      })
    }

    await createAuditLog({
      actorUserId,
      action: 'SLOT_ASSIGNED',
      entityType: 'SlotAssignment',
      entityId: assignment.id,
      metadata: { slotId: id, memberId: data.memberId },
    })

    res.status(201).json({ assignment, conflicts: conflictInfo })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.flatten().fieldErrors })
    }
    console.error('Assign slot error:', error)
    res.status(500).json({ error: 'Failed to assign slot' })
  }
})

// ============================================
// DELETE /api/schedule-slots/:id/assignment
// ============================================
router.delete('/:id/assignment', requirePermission('schedules.manage'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const actorUserId = req.user?.userId

    const assignment = await prisma.slotAssignment.findUnique({ where: { slotId: id } })
    if (!assignment) return res.status(404).json({ error: 'No assignment for this slot' })

    await prisma.slotAssignment.delete({ where: { slotId: id } })

    await createAuditLog({
      actorUserId,
      action: 'SLOT_UNASSIGNED',
      entityType: 'SlotAssignment',
      entityId: assignment.id,
      metadata: { slotId: id },
    })

    res.status(204).send()
  } catch (error) {
    console.error('Unassign slot error:', error)
    res.status(500).json({ error: 'Failed to unassign slot' })
  }
})

export default router
