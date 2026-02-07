import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// ============================================
// Schemas
// ============================================

const createMinistrySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
})

const updateMinistrySchema = createMinistrySchema.partial()

// ============================================
// GET /api/ministries
// List all ministries
// ============================================
router.get('/', requirePermission('groups.view'), async (_req: Request, res: Response) => {
  try {
    const ministries = await prisma.ministry.findMany({
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
        },
        groups: {
          select: { id: true, name: true },
        },
        _count: {
          select: { groups: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    res.json(ministries)
  } catch (error) {
    console.error('List ministries error:', error)
    res.status(500).json({ error: 'Failed to list ministries' })
  }
})

// ============================================
// GET /api/ministries/:id
// Get a single ministry
// ============================================
router.get('/:id', requirePermission('groups.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const ministry = await prisma.ministry.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, isActive: true },
        },
        groups: {
          select: { 
            id: true, 
            name: true, 
            isActive: true,
            meetingDay: true,
            meetingTime: true,
            location: true,
            _count: {
              select: { members: true, leaders: true },
            },
          },
        },
      },
    })

    if (!ministry) {
      res.status(404).json({ error: 'Ministry not found' })
      return
    }

    res.json(ministry)
  } catch (error) {
    console.error('Get ministry error:', error)
    res.status(500).json({ error: 'Failed to get ministry' })
  }
})

// ============================================
// POST /api/ministries
// Create a new ministry
// ============================================
router.post('/', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const parseResult = createMinistrySchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check if parent exists if specified
    if (data.parentId) {
      const parent = await prisma.ministry.findUnique({
        where: { id: data.parentId },
      })
      if (!parent) {
        res.status(400).json({ error: 'Parent ministry not found' })
        return
      }
    }

    const ministry = await prisma.ministry.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        isActive: data.isActive,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MINISTRY_CREATED',
        entityType: 'Ministry',
        entityId: ministry.id,
        metadata: { name: ministry.name },
      },
    })

    res.status(201).json(ministry)
  } catch (error) {
    console.error('Create ministry error:', error)
    res.status(500).json({ error: 'Failed to create ministry' })
  }
})

// ============================================
// PUT /api/ministries/:id
// Update a ministry
// ============================================
router.put('/:id', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const parseResult = updateMinistrySchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check if ministry exists
    const existing = await prisma.ministry.findUnique({
      where: { id },
    })
    if (!existing) {
      res.status(404).json({ error: 'Ministry not found' })
      return
    }

    // Check if parent exists if specified
    if (data.parentId && data.parentId !== id) {
      const parent = await prisma.ministry.findUnique({
        where: { id: data.parentId },
      })
      if (!parent) {
        res.status(400).json({ error: 'Parent ministry not found' })
        return
      }
    }

    // Prevent setting parent to self
    if (data.parentId === id) {
      res.status(400).json({ error: 'Ministry cannot be its own parent' })
      return
    }

    const ministry = await prisma.ministry.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        isActive: data.isActive,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MINISTRY_UPDATED',
        entityType: 'Ministry',
        entityId: ministry.id,
        metadata: { name: ministry.name },
      },
    })

    res.json(ministry)
  } catch (error) {
    console.error('Update ministry error:', error)
    res.status(500).json({ error: 'Failed to update ministry' })
  }
})

// ============================================
// DELETE /api/ministries/:id
// Delete a ministry
// ============================================
router.delete('/:id', requirePermission('groups.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if ministry exists
    const existing = await prisma.ministry.findUnique({
      where: { id },
      include: {
        _count: { select: { groups: true, children: true } },
      },
    })

    if (!existing) {
      res.status(404).json({ error: 'Ministry not found' })
      return
    }

    // Check if ministry has groups or children
    if (existing._count.groups > 0 || existing._count.children > 0) {
      res.status(400).json({
        error: 'Cannot delete ministry with groups or sub-ministries. Move or delete them first.',
      })
      return
    }

    await prisma.ministry.delete({
      where: { id },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MINISTRY_DELETED',
        entityType: 'Ministry',
        entityId: id,
        metadata: { name: existing.name },
      },
    })

    res.json({ message: 'Ministry deleted successfully' })
  } catch (error) {
    console.error('Delete ministry error:', error)
    res.status(500).json({ error: 'Failed to delete ministry' })
  }
})

export default router

