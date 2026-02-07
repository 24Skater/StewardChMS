import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createRegistrationSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  partySize: z.number().int().positive().default(1),
}).refine(
  (data) => data.memberId || data.guestName,
  { message: 'Either memberId or guestName is required' }
)

const createCheckInSchema = z.object({
  memberId: z.string().nullable().optional(),
  guestName: z.string().nullable().optional(),
  method: z.string().default('manual'),
}).refine(
  (data) => data.memberId || data.guestName,
  { message: 'Either memberId or guestName is required' }
)

// ============================================
// POST /api/occurrences/:id/registrations
// ============================================

router.post('/occurrences/:id/registrations', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const parseResult = createRegistrationSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // If memberId provided, verify member exists
    if (data.memberId) {
      const member = await prisma.member.findUnique({ where: { id: data.memberId } })
      if (!member) {
        res.status(400).json({ error: 'Member not found' })
        return
      }
    }

    const registration = await prisma.registration.create({
      data: {
        eventOccurrenceId: occurrenceId,
        memberId: data.memberId ?? null,
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        guestPhone: data.guestPhone ?? null,
        partySize: data.partySize,
        status: 'registered',
      },
      include: {
        member: {
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
      action: 'REGISTRATION_CREATED',
      entityType: 'Registration',
      entityId: registration.id,
      metadata: {
        occurrenceId,
        memberId: data.memberId,
        guestName: data.guestName,
      },
    })

    res.status(201).json({
      id: registration.id,
      eventOccurrenceId: registration.eventOccurrenceId,
      memberId: registration.memberId,
      guestName: registration.guestName,
      guestEmail: registration.guestEmail,
      guestPhone: registration.guestPhone,
      partySize: registration.partySize,
      status: registration.status,
      createdAt: registration.createdAt.toISOString(),
      member: registration.member,
    })
  } catch (error) {
    console.error('Create registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/occurrences/:id/registrations
// ============================================

router.get('/occurrences/:id/registrations', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const registrations = await prisma.registration.findMany({
      where: { eventOccurrenceId: occurrenceId },
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
    })

    res.json({
      registrations: registrations.map((reg: typeof registrations[0]) => ({
        id: reg.id,
        eventOccurrenceId: reg.eventOccurrenceId,
        memberId: reg.memberId,
        guestName: reg.guestName,
        guestEmail: reg.guestEmail,
        guestPhone: reg.guestPhone,
        partySize: reg.partySize,
        status: reg.status,
        createdAt: reg.createdAt.toISOString(),
        member: reg.member,
      })),
    })
  } catch (error) {
    console.error('List registrations error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/registrations/:id - Cancel registration
// ============================================

router.delete('/registrations/:id', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const registration = await prisma.registration.findUnique({ where: { id } })
    if (!registration) {
      res.status(404).json({ error: 'Registration not found' })
      return
    }

    // Soft cancel - update status
    await prisma.registration.update({
      where: { id },
      data: { status: 'canceled' },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'REGISTRATION_CANCELED',
      entityType: 'Registration',
      entityId: id,
      metadata: { occurrenceId: registration.eventOccurrenceId },
    })

    res.json({ message: 'Registration canceled successfully' })
  } catch (error) {
    console.error('Cancel registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/occurrences/:id/checkins
// ============================================

router.post('/occurrences/:id/checkins', requireAuth, requirePermission('events.write'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const parseResult = createCheckInSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // If memberId provided, verify member exists
    if (data.memberId) {
      const member = await prisma.member.findUnique({ where: { id: data.memberId } })
      if (!member) {
        res.status(400).json({ error: 'Member not found' })
        return
      }
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        eventOccurrenceId: occurrenceId,
        memberId: data.memberId ?? null,
        guestName: data.guestName ?? null,
        method: data.method,
      },
      include: {
        member: {
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
      action: 'CHECKIN_CREATED',
      entityType: 'CheckIn',
      entityId: checkIn.id,
      metadata: {
        occurrenceId,
        memberId: data.memberId,
        guestName: data.guestName,
        method: data.method,
      },
    })

    res.status(201).json({
      id: checkIn.id,
      eventOccurrenceId: checkIn.eventOccurrenceId,
      memberId: checkIn.memberId,
      guestName: checkIn.guestName,
      checkedInAt: checkIn.checkedInAt.toISOString(),
      method: checkIn.method,
      member: checkIn.member,
    })
  } catch (error) {
    console.error('Create check-in error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/occurrences/:id/checkins
// ============================================

router.get('/occurrences/:id/checkins', requireAuth, requirePermission('events.read'), async (req: Request, res: Response) => {
  try {
    const { id: occurrenceId } = req.params

    const occurrence = await prisma.eventOccurrence.findUnique({ where: { id: occurrenceId } })
    if (!occurrence) {
      res.status(404).json({ error: 'Occurrence not found' })
      return
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { eventOccurrenceId: occurrenceId },
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
    })

    res.json({
      checkIns: checkIns.map((ci: typeof checkIns[0]) => ({
        id: ci.id,
        eventOccurrenceId: ci.eventOccurrenceId,
        memberId: ci.memberId,
        guestName: ci.guestName,
        checkedInAt: ci.checkedInAt.toISOString(),
        method: ci.method,
        member: ci.member,
      })),
    })
  } catch (error) {
    console.error('List check-ins error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

