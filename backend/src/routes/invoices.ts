import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'void'])

const invoiceItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPriceCents: z.number().int().min(0, 'Unit price cannot be negative'),
})

const createInvoiceSchema = z.object({
  vendorId: z.string().nullable().optional(),
  billToName: z.string().max(200).nullable().optional(),
  issueDate: z.string(),
  dueDate: z.string().nullable().optional(),
  status: invoiceStatusSchema.optional().default('draft'),
  taxCents: z.number().int().min(0).optional().default(0),
  note: z.string().max(1000).nullable().optional(),
  items: z.array(invoiceItemInputSchema).optional(),
})

const updateInvoiceSchema = createInvoiceSchema.partial()

const createInvoiceItemSchema = invoiceItemInputSchema.extend({
  sortOrder: z.number().int().optional(),
})

const updateInvoiceItemSchema = createInvoiceItemSchema.partial()

// ============================================
// Helpers
// ============================================

// Generate invoice number: INV-YYYY-0001
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  // Find the highest sequence number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  })

  let sequence = 1
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.substring(prefix.length), 10)
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

// GET /api/invoices - List invoices with filters
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    res.json({
      invoices: invoices.map((inv: typeof invoices[0]) => ({
        ...inv,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

// GET /api/invoices/:id - Get a single invoice
router.get('/:id', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    res.json({
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
})

// POST /api/invoices - Create a new invoice
router.post('/', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { vendorId, billToName, issueDate, dueDate, status, taxCents, note, items } = parsed.data

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return res.status(400).json({ error: 'Vendor not found' })
      }
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber()

    // Calculate totals
    const itemsData = items || []
    const { subtotalCents, totalCents } = calculateTotals(itemsData, taxCents ?? 0)

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        vendorId: vendorId ?? null,
        billToName: billToName ?? null,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status ?? 'draft',
        subtotalCents,
        taxCents: taxCents ?? 0,
        totalCents,
        note: note ?? null,
        items: items ? {
          create: items.map((item: z.infer<typeof invoiceItemInputSchema>, idx: number) => ({
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
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'CREATE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: { invoiceNumber, totalCents },
    })

    res.status(201).json({
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

// PUT /api/invoices/:id - Update an invoice
router.put('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updateInvoiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const { vendorId, billToName, issueDate, dueDate, status, taxCents, note } = parsed.data

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
      existing.items.map((i: { quantity: number; unitPriceCents: number }) => ({ quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
      newTaxCents
    )

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(vendorId !== undefined && { vendorId }),
        ...(billToName !== undefined && { billToName }),
        ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status !== undefined && { status }),
        ...(taxCents !== undefined && { taxCents: newTaxCents, subtotalCents, totalCents }),
        ...(note !== undefined && { note }),
      },
      include: {
        vendor: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'UPDATE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: { changes: parsed.data },
    })

    res.json({
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating invoice:', error)
    res.status(500).json({ error: 'Failed to update invoice' })
  }
})

// DELETE /api/invoices/:id - Delete an invoice
router.delete('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } })
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    await prisma.invoice.delete({ where: { id: req.params.id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'DELETE_INVOICE',
      entityType: 'Invoice',
      entityId: req.params.id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    })

    res.json({ message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    res.status(500).json({ error: 'Failed to delete invoice' })
  }
})

// POST /api/invoices/:id/items - Add an item to an invoice
router.post('/:id/items', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createInvoiceItemSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    })
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const { description, quantity, unitPriceCents, sortOrder } = parsed.data
    const lineTotalCents = Math.round(quantity * unitPriceCents)
    const newSortOrder = sortOrder ?? (invoice.items.length > 0 
      ? Math.max(...invoice.items.map((i: { sortOrder: number }) => i.sortOrder)) + 1 
      : 0)

    // Create item and update invoice totals in a transaction
    const [item] = await prisma.$transaction([
      prisma.invoiceItem.create({
        data: {
          invoiceId: req.params.id,
          description,
          quantity,
          unitPriceCents,
          lineTotalCents,
          sortOrder: newSortOrder,
        },
      }),
      prisma.invoice.update({
        where: { id: req.params.id },
        data: {
          subtotalCents: invoice.subtotalCents + lineTotalCents,
          totalCents: invoice.totalCents + lineTotalCents,
        },
      }),
    ])

    res.status(201).json(item)
  } catch (error) {
    console.error('Error adding invoice item:', error)
    res.status(500).json({ error: 'Failed to add invoice item' })
  }
})

// PUT /api/invoice-items/:itemId - Update an invoice item
router.put('/items/:itemId', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updateInvoiceItemSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existingItem = await prisma.invoiceItem.findUnique({
      where: { id: req.params.itemId },
      include: { invoice: true },
    })
    if (!existingItem) {
      return res.status(404).json({ error: 'Invoice item not found' })
    }

    const { description, quantity, unitPriceCents, sortOrder } = parsed.data
    const newQuantity = quantity ?? existingItem.quantity
    const newUnitPrice = unitPriceCents ?? existingItem.unitPriceCents
    const newLineTotalCents = Math.round(newQuantity * newUnitPrice)
    const lineDiff = newLineTotalCents - existingItem.lineTotalCents

    // Update item and invoice totals in a transaction
    const [item] = await prisma.$transaction([
      prisma.invoiceItem.update({
        where: { id: req.params.itemId },
        data: {
          ...(description !== undefined && { description }),
          ...(quantity !== undefined && { quantity }),
          ...(unitPriceCents !== undefined && { unitPriceCents }),
          lineTotalCents: newLineTotalCents,
          ...(sortOrder !== undefined && { sortOrder }),
        },
      }),
      prisma.invoice.update({
        where: { id: existingItem.invoiceId },
        data: {
          subtotalCents: existingItem.invoice.subtotalCents + lineDiff,
          totalCents: existingItem.invoice.totalCents + lineDiff,
        },
      }),
    ])

    res.json(item)
  } catch (error) {
    console.error('Error updating invoice item:', error)
    res.status(500).json({ error: 'Failed to update invoice item' })
  }
})

// DELETE /api/invoice-items/:itemId - Delete an invoice item
router.delete('/items/:itemId', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const item = await prisma.invoiceItem.findUnique({
      where: { id: req.params.itemId },
      include: { invoice: true },
    })
    if (!item) {
      return res.status(404).json({ error: 'Invoice item not found' })
    }

    // Delete item and update invoice totals in a transaction
    await prisma.$transaction([
      prisma.invoiceItem.delete({ where: { id: req.params.itemId } }),
      prisma.invoice.update({
        where: { id: item.invoiceId },
        data: {
          subtotalCents: item.invoice.subtotalCents - item.lineTotalCents,
          totalCents: item.invoice.totalCents - item.lineTotalCents,
        },
      }),
    ])

    res.json({ message: 'Invoice item deleted successfully' })
  } catch (error) {
    console.error('Error deleting invoice item:', error)
    res.status(500).json({ error: 'Failed to delete invoice item' })
  }
})

export default router
