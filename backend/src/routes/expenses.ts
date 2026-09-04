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

const createExpenseSchema = z.object({
  vendorId: z.string().nullable().optional(),
  fundId: z.string().nullable().optional(),
  amountCents: z.number().int().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  expenseDate: z.string(),
  category: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

const updateExpenseSchema = createExpenseSchema.partial()

// ============================================
// Routes
// ============================================

// GET /api/expenses - List expenses with filters
router.get('/', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const { dateFrom, dateTo, fundId, vendorId } = req.query

    const where: Record<string, unknown> = {}

    // Date range filter
    if (dateFrom || dateTo) {
      where.expenseDate = {}
      if (dateFrom) {
        (where.expenseDate as Record<string, Date>).gte = new Date(dateFrom as string)
      }
      if (dateTo) {
        (where.expenseDate as Record<string, Date>).lte = new Date(dateTo as string)
      }
    }

    // Fund filter
    if (fundId) {
      where.fundId = fundId
    }

    // Vendor filter
    if (vendorId) {
      where.vendorId = vendorId
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          fund: {
            select: { id: true, name: true },
          },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    res.json({
      expenses: expenses.map((e: typeof expenses[0]) => ({
        ...e,
        expenseDate: e.expenseDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// GET /api/expenses/:id - Get a single expense
router.get('/:id', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json({
      ...expense,
      expenseDate: expense.expenseDate.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching expense:', error)
    res.status(500).json({ error: 'Failed to fetch expense' })
  }
})

// POST /api/expenses - Create a new expense
router.post('/', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { vendorId, fundId, amountCents, currency, expenseDate, category, note } = parsed.data

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor not found' })
      }
    }

    // Validate fund exists if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found' })
      }
    }

    const expense = await prisma.expense.create({
      data: {
        orgId: requireOrgId(),
        vendorId: vendorId ?? null,
        fundId: fundId ?? null,
        amountCents,
        currency: currency ?? 'USD',
        expenseDate: new Date(expenseDate),
        category: category ?? null,
        note: note ?? null,
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      metadata: { amountCents, category },
    })

    res.status(201).json({
      ...expense,
      expenseDate: expense.expenseDate.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// PUT /api/expenses/:id - Update an expense
router.put('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updateExpenseSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    const { vendorId, fundId, amountCents, currency, expenseDate, category, note } = parsed.data

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor not found' })
      }
    }

    // Validate fund exists if provided
    if (fundId) {
      const fund = await prisma.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found' })
      }
    }

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        ...(vendorId !== undefined && { vendorId }),
        ...(fundId !== undefined && { fundId }),
        ...(amountCents !== undefined && { amountCents }),
        ...(currency !== undefined && { currency }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(category !== undefined && { category }),
        ...(note !== undefined && { note }),
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        fund: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'UPDATE_EXPENSE',
      entityType: 'Expense',
      entityId: expense.id,
      metadata: { changes: parsed.data },
    })

    res.json({
      ...expense,
      expenseDate: expense.expenseDate.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// DELETE /api/expenses/:id - Delete an expense
router.delete('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } })
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    await prisma.expense.delete({ where: { id: req.params.id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'DELETE_EXPENSE',
      entityType: 'Expense',
      entityId: req.params.id,
      metadata: { amountCents: expense.amountCents },
    })

    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

export default router
