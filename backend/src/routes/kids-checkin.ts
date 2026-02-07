import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const checkInSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  occurrenceId: z.string().min(1, 'Occurrence ID is required'),
  parentGuardianName: z.string().optional(),
})

const checkOutSchema = z.object({
  securityCode: z.string().min(1, 'Security code is required'),
})

// ============================================
// Helper Functions
// ============================================

function generateSecurityCode(): string {
  // Generate a 4-digit alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid confusing characters
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(crypto.randomInt(chars.length))
  }
  return code
}

// ============================================
// GET /api/kids-checkin/children
// Get all children for check-in
// ============================================
router.get('/children', requirePermission('checkin.view'), async (_req: Request, res: Response) => {
  try {
    const children = await prisma.member.findMany({
      where: {
        isChild: true,
        status: 'active',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        allergies: true,
        medicalNotes: true,
        parentalNotes: true,
        profilePhotoUrl: true,
        householdMembers: {
          include: {
            household: {
              include: {
                members: {
                  include: {
                    member: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        isChild: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    // Transform to include parents/guardians
    const result = children.map((child) => {
      const parents = child.householdMembers
        .flatMap((hm) => hm.household.members)
        .filter((hm) => !hm.member.isChild)
        .map((hm) => ({
          id: hm.member.id,
          firstName: hm.member.firstName,
          lastName: hm.member.lastName,
          phone: hm.member.phone,
        }))

      return {
        ...child,
        householdMembers: undefined,
        parents: [...new Map(parents.map((p) => [p.id, p])).values()],
      }
    })

    res.json(result)
  } catch (error) {
    console.error('Get children error:', error)
    res.status(500).json({ error: 'Failed to get children' })
  }
})

// ============================================
// GET /api/kids-checkin/occurrences
// Get today's occurrences for check-in
// ============================================
router.get('/occurrences', requirePermission('checkin.view'), async (_req: Request, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const occurrences = await prisma.eventOccurrence.findMany({
      where: {
        startsAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        event: {
          select: { id: true, title: true },
        },
        _count: {
          select: { checkIns: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    })

    res.json(occurrences)
  } catch (error) {
    console.error('Get occurrences error:', error)
    res.status(500).json({ error: 'Failed to get occurrences' })
  }
})

// ============================================
// GET /api/kids-checkin/checked-in
// Get currently checked-in children
// ============================================
router.get('/checked-in', requirePermission('checkin.view'), async (req: Request, res: Response) => {
  try {
    const { occurrenceId } = req.query

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkIns = await prisma.checkIn.findMany({
      where: {
        checkedInAt: {
          gte: today,
        },
        checkedOutAt: null,
        member: {
          isChild: true,
        },
        ...(occurrenceId && { eventOccurrenceId: String(occurrenceId) }),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            securityCode: true,
            allergies: true,
            medicalNotes: true,
          },
        },
        occurrence: {
          include: {
            event: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
    })

    res.json(checkIns)
  } catch (error) {
    console.error('Get checked-in error:', error)
    res.status(500).json({ error: 'Failed to get checked-in children' })
  }
})

// ============================================
// POST /api/kids-checkin/checkin
// Check in a child
// ============================================
router.post('/checkin', requirePermission('checkin.operate'), async (req: Request, res: Response) => {
  try {
    const parseResult = checkInSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { memberId, occurrenceId, parentGuardianName } = parseResult.data

    // Check if member exists and is a child
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    })
    if (!member) {
      res.status(404).json({ error: 'Child not found' })
      return
    }
    if (!member.isChild) {
      res.status(400).json({ error: 'Member is not marked as a child' })
      return
    }

    // Check if occurrence exists
    const occurrence = await prisma.eventOccurrence.findUnique({
      where: { id: occurrenceId },
    })
    if (!occurrence) {
      res.status(404).json({ error: 'Event occurrence not found' })
      return
    }

    // Check if already checked in
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        memberId,
        eventOccurrenceId: occurrenceId,
        checkedOutAt: null,
      },
    })
    if (existingCheckIn) {
      res.status(400).json({ error: 'Child is already checked in to this event' })
      return
    }

    // Generate security code if not set
    let securityCode = member.securityCode
    if (!securityCode) {
      // Generate unique code
      let attempts = 0
      while (attempts < 10) {
        securityCode = generateSecurityCode()
        const exists = await prisma.member.findUnique({
          where: { securityCode },
        })
        if (!exists) break
        attempts++
      }

      // Update member with security code
      await prisma.member.update({
        where: { id: memberId },
        data: { securityCode },
      })
    }

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        memberId,
        eventOccurrenceId: occurrenceId,
        checkedInAt: new Date(),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            securityCode: true,
            allergies: true,
            medicalNotes: true,
          },
        },
        occurrence: {
          include: {
            event: {
              select: { title: true },
            },
          },
        },
      },
    })

    res.status(201).json({
      ...checkIn,
      securityCode,
      parentGuardianName,
      label: {
        childName: `${member.firstName} ${member.lastName}`,
        eventName: checkIn.occurrence.event.title,
        securityCode,
        allergies: member.allergies,
        medicalNotes: member.medicalNotes,
        checkedInAt: checkIn.checkedInAt,
        parentGuardianName,
      },
    })
  } catch (error) {
    console.error('Check in error:', error)
    res.status(500).json({ error: 'Failed to check in' })
  }
})

// ============================================
// POST /api/kids-checkin/checkout
// Check out a child by security code
// ============================================
router.post('/checkout', requirePermission('checkin.operate'), async (req: Request, res: Response) => {
  try {
    const parseResult = checkOutSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { securityCode } = parseResult.data

    // Find the member by security code
    const member = await prisma.member.findUnique({
      where: { securityCode: securityCode.toUpperCase() },
    })
    if (!member) {
      res.status(404).json({ error: 'Invalid security code' })
      return
    }

    // Find active check-in
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        memberId: member.id,
        checkedInAt: {
          gte: today,
        },
        checkedOutAt: null,
      },
      include: {
        occurrence: {
          include: {
            event: {
              select: { title: true },
            },
          },
        },
      },
    })

    if (!checkIn) {
      res.status(404).json({ error: 'No active check-in found for this security code' })
      return
    }

    // Update check-out time
    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: checkIn.id },
      data: { checkedOutAt: new Date() },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        occurrence: {
          include: {
            event: {
              select: { title: true },
            },
          },
        },
      },
    })

    res.json(updatedCheckIn)
  } catch (error) {
    console.error('Check out error:', error)
    res.status(500).json({ error: 'Failed to check out' })
  }
})

// ============================================
// POST /api/kids-checkin/checkout/:checkInId
// Check out by check-in ID (staff override)
// ============================================
router.post('/checkout/:checkInId', requirePermission('checkin.operate'), async (req: Request, res: Response) => {
  try {
    const { checkInId } = req.params

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: checkInId },
    })

    if (!checkIn) {
      res.status(404).json({ error: 'Check-in not found' })
      return
    }

    if (checkIn.checkedOutAt) {
      res.status(400).json({ error: 'Already checked out' })
      return
    }

    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: checkInId },
      data: { checkedOutAt: new Date() },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        occurrence: {
          include: {
            event: {
              select: { title: true },
            },
          },
        },
      },
    })

    res.json(updatedCheckIn)
  } catch (error) {
    console.error('Check out by ID error:', error)
    res.status(500).json({ error: 'Failed to check out' })
  }
})

// ============================================
// GET /api/kids-checkin/stats
// Get check-in statistics for today
// ============================================
router.get('/stats', requirePermission('checkin.view'), async (_req: Request, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalChildren = await prisma.member.count({
      where: { isChild: true, status: 'active' },
    })

    const checkedInToday = await prisma.checkIn.count({
      where: {
        checkedInAt: { gte: today },
        member: { isChild: true },
      },
    })

    const currentlyCheckedIn = await prisma.checkIn.count({
      where: {
        checkedInAt: { gte: today },
        checkedOutAt: null,
        member: { isChild: true },
      },
    })

    const checkedOutToday = await prisma.checkIn.count({
      where: {
        checkedInAt: { gte: today },
        checkedOutAt: { not: null },
        member: { isChild: true },
      },
    })

    res.json({
      totalChildren,
      checkedInToday,
      currentlyCheckedIn,
      checkedOutToday,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to get statistics' })
  }
})

export default router

