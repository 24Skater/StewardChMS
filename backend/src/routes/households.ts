import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const relationshipTypeSchema = z.enum(['parent', 'child', 'spouse', 'other'])

const createHouseholdSchema = z.object({
  name: z.string().max(200).nullable().optional(),
})

const updateHouseholdSchema = createHouseholdSchema

const linkMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  relationshipType: relationshipTypeSchema,
})

// ============================================
// Helper: Format household response
// ============================================

function formatHouseholdResponse(household: {
  id: string
  name: string | null
  createdAt: Date
  updatedAt: Date
  members: Array<{
    id: string
    memberId: string
    relationshipType: string
    member: {
      firstName: string
      lastName: string
    }
  }>
}) {
  return {
    id: household.id,
    name: household.name,
    createdAt: household.createdAt.toISOString(),
    updatedAt: household.updatedAt.toISOString(),
    members: household.members.map(hm => ({
      id: hm.id,
      memberId: hm.memberId,
      firstName: hm.member.firstName,
      lastName: hm.member.lastName,
      relationshipType: hm.relationshipType,
    })),
  }
}

// ============================================
// GET /api/households - List all households
// ============================================

router.get('/', requireAuth, requirePermission('members.read'), async (_req: Request, res: Response) => {
  try {
    const households = await prisma.household.findMany({
      include: {
        members: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      households: households.map(formatHouseholdResponse),
      total: households.length,
    })
  } catch (error) {
    console.error('List households error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/households/:id - Get single household
// ============================================

router.get('/:id', requireAuth, requirePermission('members.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!household) {
      res.status(404).json({ error: 'Household not found' })
      return
    }

    res.json(formatHouseholdResponse(household))
  } catch (error) {
    console.error('Get household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/households - Create household
// ============================================

router.post('/', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const parseResult = createHouseholdSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { name } = parseResult.data

    const household = await prisma.household.create({
      data: {
        name: name ?? null,
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'HOUSEHOLD_CREATED',
        entityType: 'Household',
        entityId: household.id,
        metadata: { name: household.name },
      },
    })

    res.status(201).json(formatHouseholdResponse(household))
  } catch (error) {
    console.error('Create household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/households/:id - Update household
// ============================================

router.put('/:id', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.household.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Household not found' })
      return
    }

    const parseResult = updateHouseholdSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { name } = parseResult.data

    const household = await prisma.household.update({
      where: { id },
      data: {
        name: name ?? null,
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'HOUSEHOLD_UPDATED',
        entityType: 'Household',
        entityId: household.id,
        metadata: { name: household.name },
      },
    })

    res.json(formatHouseholdResponse(household))
  } catch (error) {
    console.error('Update household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/households/:id - Delete household
// ============================================

router.delete('/:id', requireAuth, requirePermission('members.delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.household.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Household not found' })
      return
    }

    await prisma.household.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'HOUSEHOLD_DELETED',
        entityType: 'Household',
        entityId: id,
        metadata: { name: existing.name },
      },
    })

    res.json({ message: 'Household deleted successfully' })
  } catch (error) {
    console.error('Delete household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/households/:id/members - Link member to household
// ============================================

router.post('/:id/members', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const household = await prisma.household.findUnique({ where: { id } })
    if (!household) {
      res.status(404).json({ error: 'Household not found' })
      return
    }

    const parseResult = linkMemberSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { memberId, relationshipType } = parseResult.data

    // Check if member exists
    const member = await prisma.member.findUnique({ where: { id: memberId } })
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    // Check if already linked
    const existingLink = await prisma.householdMember.findUnique({
      where: {
        householdId_memberId: {
          householdId: id,
          memberId,
        },
      },
    })
    if (existingLink) {
      res.status(409).json({ error: 'Member is already linked to this household' })
      return
    }

    const householdMember = await prisma.householdMember.create({
      data: {
        householdId: id,
        memberId,
        relationshipType,
      },
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'HOUSEHOLD_MEMBER_LINKED',
        entityType: 'HouseholdMember',
        entityId: householdMember.id,
        metadata: {
          householdId: id,
          memberId,
          relationshipType,
          memberName: `${member.firstName} ${member.lastName}`,
        },
      },
    })

    res.status(201).json({
      id: householdMember.id,
      memberId: householdMember.memberId,
      firstName: householdMember.member.firstName,
      lastName: householdMember.member.lastName,
      relationshipType: householdMember.relationshipType,
    })
  } catch (error) {
    console.error('Link member to household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/households/:id/members/:memberId - Unlink member
// ============================================

router.delete('/:id/members/:memberId', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params

    const existingLink = await prisma.householdMember.findUnique({
      where: {
        householdId_memberId: {
          householdId: id,
          memberId,
        },
      },
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!existingLink) {
      res.status(404).json({ error: 'Member is not linked to this household' })
      return
    }

    await prisma.householdMember.delete({
      where: {
        householdId_memberId: {
          householdId: id,
          memberId,
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'HOUSEHOLD_MEMBER_UNLINKED',
        entityType: 'HouseholdMember',
        entityId: existingLink.id,
        metadata: {
          householdId: id,
          memberId,
          memberName: `${existingLink.member.firstName} ${existingLink.member.lastName}`,
        },
      },
    })

    res.json({ message: 'Member unlinked from household successfully' })
  } catch (error) {
    console.error('Unlink member from household error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

