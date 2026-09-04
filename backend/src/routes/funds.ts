import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createFundSchema = z.object({
  name: z.string().min(1, 'Fund name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  isRestricted: z.boolean().optional().default(false),
})

const updateFundSchema = createFundSchema.partial()

// ============================================
// Routes
// ============================================

// GET /api/funds - List all funds
router.get('/', requireAuth, requirePermission('accounting.view'), async (_req, res) => {
  try {
    const funds = await prisma.fund.findMany({
      orderBy: { name: 'asc' },
    })

    res.json({
      funds: funds.map((fund: typeof funds[0]) => ({
        ...fund,
        createdAt: fund.createdAt.toISOString(),
        updatedAt: fund.updatedAt.toISOString(),
      })),
      total: funds.length,
    })
  } catch (error) {
    console.error('Error fetching funds:', error)
    res.status(500).json({ error: 'Failed to fetch funds' })
  }
})

// GET /api/funds/:id - Get a single fund
router.get('/:id', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: req.params.id },
    })

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' })
    }

    res.json({
      ...fund,
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching fund:', error)
    res.status(500).json({ error: 'Failed to fetch fund' })
  }
})

// POST /api/funds - Create a new fund
router.post('/', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createFundSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { name, description, isRestricted } = parsed.data

    // Check for duplicate name
    const existing = await prisma.fund.findFirst({ where: { name } })
    if (existing) {
      return res.status(409).json({ error: 'A fund with this name already exists' })
    }

    const fund = await prisma.fund.create({
      data: {
        orgId: requireOrgId(),
        name,
        description: description ?? null,
        isRestricted: isRestricted ?? false,
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'CREATE_FUND',
      entityType: 'Fund',
      entityId: fund.id,
      metadata: { name },
    })

    res.status(201).json({
      ...fund,
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating fund:', error)
    res.status(500).json({ error: 'Failed to create fund' })
  }
})

// PUT /api/funds/:id - Update a fund
router.put('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updateFundSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.fund.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Fund not found' })
    }

    const { name, description, isRestricted } = parsed.data

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.fund.findFirst({ where: { name } })
      if (duplicate) {
        return res.status(409).json({ error: 'A fund with this name already exists' })
      }
    }

    const fund = await prisma.fund.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isRestricted !== undefined && { isRestricted }),
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'UPDATE_FUND',
      entityType: 'Fund',
      entityId: fund.id,
      metadata: { changes: parsed.data },
    })

    res.json({
      ...fund,
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating fund:', error)
    res.status(500).json({ error: 'Failed to update fund' })
  }
})

// DELETE /api/funds/:id - Delete a fund (only if no dependencies)
router.delete('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            donations: true,
            pledges: true,
            expenses: true,
          },
        },
      },
    })

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' })
    }

    // Check for dependencies
    const totalDependencies = fund._count.donations + fund._count.pledges + fund._count.expenses
    if (totalDependencies > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete fund with existing donations, pledges, or expenses',
        details: {
          donations: fund._count.donations,
          pledges: fund._count.pledges,
          expenses: fund._count.expenses,
        }
      })
    }

    await prisma.fund.delete({ where: { id: req.params.id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'DELETE_FUND',
      entityType: 'Fund',
      entityId: req.params.id,
      metadata: { name: fund.name },
    })

    res.json({ message: 'Fund deleted successfully' })
  } catch (error) {
    console.error('Error deleting fund:', error)
    res.status(500).json({ error: 'Failed to delete fund' })
  }
})

export default router
