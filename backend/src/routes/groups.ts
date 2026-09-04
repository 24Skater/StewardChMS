import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ministryId: z.string().min(1, 'Ministry is required'),
  description: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
})

const updateGroupSchema = createGroupSchema.partial().omit({ ministryId: true })

const addMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
})

const addLeaderSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.string().default('leader'),
})

// ============================================
// GET /api/groups
// List all groups
// ============================================
router.get('/', requirePermission('groups.view'), async (req: Request, res: Response) => {
  try {
    const { ministryId, isActive } = req.query

    const groups = await prisma.group.findMany({
      where: {
        ...(ministryId && { ministryId: String(ministryId) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      include: {
        ministry: {
          select: { id: true, name: true },
        },
        _count: {
          select: { members: true, leaders: true },
        },
      },
      orderBy: [{ ministry: { name: 'asc' } }, { name: 'asc' }],
    })

    res.json(groups)
  } catch (error) {
    console.error('List groups error:', error)
    res.status(500).json({ error: 'Failed to list groups' })
  }
})

// ============================================
// GET /api/groups/:id
// Get a single group with members and leaders
// ============================================
router.get('/:id', requirePermission('groups.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        ministry: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        leaders: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
      },
    })

    if (!group) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    res.json(group)
  } catch (error) {
    console.error('Get group error:', error)
    res.status(500).json({ error: 'Failed to get group' })
  }
})

// ============================================
// POST /api/groups
// Create a new group
// ============================================
router.post('/', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const parseResult = createGroupSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check if ministry exists
    const ministry = await prisma.ministry.findUnique({
      where: { id: data.ministryId },
    })
    if (!ministry) {
      res.status(400).json({ error: 'Ministry not found' })
      return
    }

    const group = await prisma.group.create({
      data: {
        orgId: requireOrgId(),
        name: data.name,
        ministryId: data.ministryId,
        description: data.description,
        meetingDay: data.meetingDay,
        meetingTime: data.meetingTime,
        location: data.location,
        capacity: data.capacity,
        isActive: data.isActive,
      },
      include: {
        ministry: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'GROUP_CREATED',
      entityType: 'Group',
      entityId: group.id,
      metadata: { name: group.name, ministryId: group.ministryId },
    })

    res.status(201).json(group)
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// ============================================
// PUT /api/groups/:id
// Update a group
// ============================================
router.put('/:id', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = updateGroupSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check if group exists
    const existing = await prisma.group.findUnique({
      where: { id },
    })
    if (!existing) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        meetingDay: data.meetingDay,
        meetingTime: data.meetingTime,
        location: data.location,
        capacity: data.capacity,
        isActive: data.isActive,
      },
      include: {
        ministry: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'GROUP_UPDATED',
      entityType: 'Group',
      entityId: group.id,
      metadata: { name: group.name },
    })

    res.json(group)
  } catch (error) {
    console.error('Update group error:', error)
    res.status(500).json({ error: 'Failed to update group' })
  }
})

// ============================================
// DELETE /api/groups/:id
// Delete a group
// ============================================
router.delete('/:id', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if group exists
    const existing = await prisma.group.findUnique({
      where: { id },
    })
    if (!existing) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    // Delete group (cascade deletes members and leaders)
    await prisma.group.delete({
      where: { id },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'GROUP_DELETED',
      entityType: 'Group',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Delete group error:', error)
    res.status(500).json({ error: 'Failed to delete group' })
  }
})

// ============================================
// POST /api/groups/:id/members
// Add a member to a group
// ============================================
router.post('/:id/members', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = addMemberSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { memberId } = parseResult.data

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    })
    if (!group) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    })
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId: id, memberId },
      },
    })
    if (existing) {
      res.status(400).json({ error: 'Member is already in this group' })
      return
    }

    const groupMember = await prisma.groupMember.create({
      data: {
        orgId: requireOrgId(),
        groupId: id,
        memberId,
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    res.status(201).json(groupMember)
  } catch (error) {
    console.error('Add group member error:', error)
    res.status(500).json({ error: 'Failed to add member to group' })
  }
})

// ============================================
// DELETE /api/groups/:id/members/:memberId
// Remove a member from a group
// ============================================
router.delete('/:id/members/:memberId', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params

    // Check if group membership exists
    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId: id, memberId },
      },
    })
    if (!existing) {
      res.status(404).json({ error: 'Member is not in this group' })
      return
    }

    await prisma.groupMember.delete({
      where: { id: existing.id },
    })

    res.json({ message: 'Member removed from group' })
  } catch (error) {
    console.error('Remove group member error:', error)
    res.status(500).json({ error: 'Failed to remove member from group' })
  }
})

// ============================================
// POST /api/groups/:id/leaders
// Add a leader to a group
// ============================================
router.post('/:id/leaders', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = addLeaderSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { memberId, role } = parseResult.data

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
    })
    if (!group) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    })
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    // Check if already a leader
    const existing = await prisma.groupLeader.findUnique({
      where: {
        groupId_memberId: { groupId: id, memberId },
      },
    })
    if (existing) {
      res.status(400).json({ error: 'Member is already a leader of this group' })
      return
    }

    const groupLeader = await prisma.groupLeader.create({
      data: {
        orgId: requireOrgId(),
        groupId: id,
        memberId,
        role,
      },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    res.status(201).json(groupLeader)
  } catch (error) {
    console.error('Add group leader error:', error)
    res.status(500).json({ error: 'Failed to add leader to group' })
  }
})

// ============================================
// DELETE /api/groups/:id/leaders/:memberId
// Remove a leader from a group
// ============================================
router.delete('/:id/leaders/:memberId', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params

    // Check if leader exists
    const existing = await prisma.groupLeader.findUnique({
      where: {
        groupId_memberId: { groupId: id, memberId },
      },
    })
    if (!existing) {
      res.status(404).json({ error: 'Member is not a leader of this group' })
      return
    }

    await prisma.groupLeader.delete({
      where: { id: existing.id },
    })

    res.json({ message: 'Leader removed from group' })
  } catch (error) {
    console.error('Remove group leader error:', error)
    res.status(500).json({ error: 'Failed to remove leader from group' })
  }
})

export default router

