import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const purchaseOrderStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'closed', 'void'])

const purchaseOrderItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPriceCents: z.number().int().min(0, 'Unit price cannot be negative'),
})

const createPurchaseOrderSchema = z.object({
  vendorId: z.string().nullable().optional(),
  issueDate: z.string(),
  status: purchaseOrderStatusSchema.optional().default('draft'),
  taxCents: z.number().int().min(0).optional().default(0),
  note: z.string().max(1000).nullable().optional(),
  items: z.array(purchaseOrderItemInputSchema).optional(),
})

const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial()

const createPurchaseOrderItemSchema = purchaseOrderItemInputSchema.extend({
  sortOrder: z.number().int().optional(),
})

const updatePurchaseOrderItemSchema = createPurchaseOrderItemSchema.partial()

// ============================================
// Helpers
// ============================================

// Generate PO number: PO-YYYY-0001
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`

  // Find the highest sequence number for this year
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      poNumber: 'desc',
    },
  })

  let sequence = 1
  if (lastPO) {
    const lastSequence = parseInt(lastPO.poNumber.substring(prefix.length), 10)
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

// Calculate totals from items
function calculateTotals(items: { quantity: number; unitPriceCents: number }[], taxCents: number) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0)
  const totalCents = subtotalCents + taxCents
  return { subtotalCents, totalCents }
}

// ============================================
// Routes
// ============================================

// GET /api/purchase-orders - List purchase orders with filters
router.get('/', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const { status, vendorId } = req.query

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (vendorId) {
      where.vendorId = vendorId
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          requestorUser: {
            select: { id: true, name: true, email: true },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    res.json({
      purchaseOrders: purchaseOrders.map(po => ({
        ...po,
        issueDate: po.issueDate.toISOString(),
        createdAt: po.createdAt.toISOString(),
        updatedAt: po.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    res.status(500).json({ error: 'Failed to fetch purchase orders' })
  }
})

// GET /api/purchase-orders/:id - Get a single purchase order
router.get('/:id', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        requestorUser: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' })
    }

    res.json({
      ...po,
      issueDate: po.issueDate.toISOString(),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching purchase order:', error)
    res.status(500).json({ error: 'Failed to fetch purchase order' })
  }
})

// POST /api/purchase-orders - Create a new purchase order
router.post('/', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createPurchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { vendorId, issueDate, status, taxCents, note, items } = parsed.data

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor not found' })
      }
    }

    // Generate PO number
    const poNumber = await generatePONumber()

    // Calculate totals
    const itemsData = items || []
    const { subtotalCents, totalCents } = calculateTotals(itemsData, taxCents ?? 0)

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: vendorId ?? null,
        requestorUserId: req.user!.userId,
        issueDate: new Date(issueDate),
        status: status ?? 'draft',
        subtotalCents,
        taxCents: taxCents ?? 0,
        totalCents,
        note: note ?? null,
        items: items ? {
          create: items.map((item: z.infer<typeof purchaseOrderItemInputSchema>, idx: number) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: Math.round(item.quantity * item.unitPriceCents),
            sortOrder: idx,
          })),
        } : undefined,
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        requestorUser: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'CREATE_PURCHASE_ORDER',
        entityType: 'PurchaseOrder',
        entityId: po.id,
        metadata: { poNumber, totalCents },
      },
    })

    res.status(201).json({
      ...po,
      issueDate: po.issueDate.toISOString(),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    res.status(500).json({ error: 'Failed to create purchase order' })
  }
})

// PUT /api/purchase-orders/:id - Update a purchase order
router.put('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updatePurchaseOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' })
    }

    const { vendorId, issueDate, status, taxCents, note } = parsed.data

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor not found' })
      }
    }

    // Recalculate totals if tax changed
    const newTaxCents = taxCents ?? existing.taxCents
    const { subtotalCents, totalCents } = calculateTotals(
      existing.items.map(i => ({ quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
      newTaxCents
    )

    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(vendorId !== undefined && { vendorId }),
        ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
        ...(status !== undefined && { status }),
        ...(taxCents !== undefined && { taxCents: newTaxCents, subtotalCents, totalCents }),
        ...(note !== undefined && { note }),
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        requestorUser: {
          select: { id: true, name: true, email: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'UPDATE_PURCHASE_ORDER',
        entityType: 'PurchaseOrder',
        entityId: po.id,
        metadata: { changes: parsed.data },
      },
    })

    res.json({
      ...po,
      issueDate: po.issueDate.toISOString(),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating purchase order:', error)
    res.status(500).json({ error: 'Failed to update purchase order' })
  }
})

// DELETE /api/purchase-orders/:id - Delete a purchase order
router.delete('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } })
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' })
    }

    await prisma.purchaseOrder.delete({ where: { id: req.params.id } })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'DELETE_PURCHASE_ORDER',
        entityType: 'PurchaseOrder',
        entityId: req.params.id,
        metadata: { poNumber: po.poNumber },
      },
    })

    res.json({ message: 'Purchase order deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    res.status(500).json({ error: 'Failed to delete purchase order' })
  }
})

// POST /api/purchase-orders/:id/items - Add an item to a purchase order
router.post('/:id/items', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createPurchaseOrderItemSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' })
    }

    const { description, quantity, unitPriceCents, sortOrder } = parsed.data
    const lineTotalCents = Math.round(quantity * unitPriceCents)
    const newSortOrder = sortOrder ?? (po.items.length > 0 
      ? Math.max(...po.items.map(i => i.sortOrder)) + 1 
      : 0)

    // Create item and update PO totals in a transaction
    const [item] = await prisma.$transaction([
      prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: req.params.id,
          description,
          quantity,
          unitPriceCents,
          lineTotalCents,
          sortOrder: newSortOrder,
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: req.params.id },
        data: {
          subtotalCents: po.subtotalCents + lineTotalCents,
          totalCents: po.totalCents + lineTotalCents,
        },
      }),
    ])

    res.status(201).json(item)
  } catch (error) {
    console.error('Error adding purchase order item:', error)
    res.status(500).json({ error: 'Failed to add purchase order item' })
  }
})

// PUT /api/purchase-order-items/:itemId - Update a purchase order item
router.put('/items/:itemId', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updatePurchaseOrderItemSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existingItem = await prisma.purchaseOrderItem.findUnique({
      where: { id: req.params.itemId },
      include: { purchaseOrder: true },
    })
    if (!existingItem) {
      return res.status(404).json({ error: 'Purchase order item not found' })
    }

    const { description, quantity, unitPriceCents, sortOrder } = parsed.data
    const newQuantity = quantity ?? existingItem.quantity
    const newUnitPrice = unitPriceCents ?? existingItem.unitPriceCents
    const newLineTotalCents = Math.round(newQuantity * newUnitPrice)
    const lineDiff = newLineTotalCents - existingItem.lineTotalCents

    // Update item and PO totals in a transaction
    const [item] = await prisma.$transaction([
      prisma.purchaseOrderItem.update({
        where: { id: req.params.itemId },
        data: {
          ...(description !== undefined && { description }),
          ...(quantity !== undefined && { quantity }),
          ...(unitPriceCents !== undefined && { unitPriceCents }),
          lineTotalCents: newLineTotalCents,
          ...(sortOrder !== undefined && { sortOrder }),
        },
      }),
      prisma.purchaseOrder.update({
        where: { id: existingItem.purchaseOrderId },
        data: {
          subtotalCents: existingItem.purchaseOrder.subtotalCents + lineDiff,
          totalCents: existingItem.purchaseOrder.totalCents + lineDiff,
        },
      }),
    ])

    res.json(item)
  } catch (error) {
    console.error('Error updating purchase order item:', error)
    res.status(500).json({ error: 'Failed to update purchase order item' })
  }
})

// DELETE /api/purchase-order-items/:itemId - Delete a purchase order item
router.delete('/items/:itemId', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { id: req.params.itemId },
      include: { purchaseOrder: true },
    })
    if (!item) {
      return res.status(404).json({ error: 'Purchase order item not found' })
    }

    // Delete item and update PO totals in a transaction
    await prisma.$transaction([
      prisma.purchaseOrderItem.delete({ where: { id: req.params.itemId } }),
      prisma.purchaseOrder.update({
        where: { id: item.purchaseOrderId },
        data: {
          subtotalCents: item.purchaseOrder.subtotalCents - item.lineTotalCents,
          totalCents: item.purchaseOrder.totalCents - item.lineTotalCents,
        },
      }),
    ])

    res.json({ message: 'Purchase order item deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase order item:', error)
    res.status(500).json({ error: 'Failed to delete purchase order item' })
  }
})

export default router
