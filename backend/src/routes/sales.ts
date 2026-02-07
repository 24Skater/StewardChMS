import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { JwtPayload } from '../lib/auth.js'
import { createAuditLog } from '../lib/audit.js'

// Product type for map lookups
interface ProductData {
  id: string
  name: string
  priceCents: number
  sku: string | null
}

const router = Router()

// Zod schemas
const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be positive'),
})

const createSaleSchema = z.object({
  memberId: z.string().optional(),
  guestName: z.string().optional(),
  taxCents: z.number().int().min(0).default(0),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
})

// POST /api/sales - Create a sale
router.post('/', requireAuth, requirePermission('sales.edit'), async (req, res) => {
  try {
    const parsed = createSaleSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues })
    }

    const { memberId, guestName, taxCents, items } = parsed.data
    const user = req.user as JwtPayload

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Generate sale number within transaction
      const saleNumber = await (async () => {
        const year = new Date().getFullYear()
        const prefix = `SALE-${year}-`
        const latestSale = await tx.sale.findFirst({
          where: { saleNumber: { startsWith: prefix } },
          orderBy: { saleNumber: 'desc' },
          select: { saleNumber: true },
        })
        let nextNumber = 1
        if (latestSale) {
          const match = latestSale.saleNumber.match(/SALE-\d{4}-(\d+)/)
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1
          }
        }
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`
      })()

      // Fetch products and calculate totals
      const productIds = items.map(item => item.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      })

      if (products.length !== productIds.length) {
        throw new Error('One or more products not found')
      }

      const productMap = new Map<string, ProductData>(products.map((p) => [p.id, p as ProductData]))

      // Calculate line items and subtotal
      let subtotalCents = 0
      const saleItems: Array<{
        productId: string
        quantity: number
        unitPriceCents: number
        lineTotalCents: number
        sortOrder: number
      }> = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const product = productMap.get(item.productId)!
        const lineTotalCents = item.quantity * product.priceCents
        subtotalCents += lineTotalCents

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: product.priceCents,
          lineTotalCents,
          sortOrder: i,
        })
      }

      const totalCents = subtotalCents + taxCents

      // Create the sale
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          memberId: memberId || null,
          guestName: !memberId ? (guestName || null) : null,
          status: 'completed',
          subtotalCents,
          taxCents,
          totalCents,
          soldAt: new Date(),
          createdByUserId: user.userId,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Deduct inventory for each item
      for (const item of saleItems) {
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'sale',
            quantityDelta: -item.quantity, // Negative to reduce stock
            note: `Sale ${saleNumber}`,
          },
        })
      }

      return sale
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.userId,
      action: 'CREATE',
      entityType: 'Sale',
      entityId: result.id,
      metadata: { saleNumber: result.saleNumber, totalCents: result.totalCents },
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('Error creating sale:', error)
    const message = error instanceof Error ? error.message : 'Failed to create sale'
    res.status(500).json({ error: message })
  }
})

// GET /api/sales - List sales
router.get('/', requireAuth, requirePermission('sales.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, status, limit = '100' } = req.query

    const where: Record<string, unknown> = {}

    if (dateFrom || dateTo) {
      where.soldAt = {}
      if (dateFrom) {
        (where.soldAt as Record<string, Date>).gte = new Date(dateFrom as string)
      }
      if (dateTo) {
        (where.soldAt as Record<string, Date>).lte = new Date(dateTo as string)
      }
    }

    if (status) {
      where.status = status
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { soldAt: 'desc' },
      take: parseInt(limit as string, 10),
    })

    res.json({ sales })
  } catch (error) {
    console.error('Error listing sales:', error)
    res.status(500).json({ error: 'Failed to list sales' })
  }
})

// GET /api/sales/:id - Get single sale
router.get('/:id', requireAuth, requirePermission('sales.view'), async (req, res) => {
  try {
    const { id } = req.params

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' })
    }

    res.json(sale)
  } catch (error) {
    console.error('Error fetching sale:', error)
    res.status(500).json({ error: 'Failed to fetch sale' })
  }
})

// POST /api/sales/:id/void - Void a sale
router.post('/:id/void', requireAuth, requirePermission('sales.edit'), async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user as JwtPayload

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: true,
        },
      })

      if (!sale) {
        throw new Error('Sale not found')
      }

      if (sale.status === 'void') {
        throw new Error('Sale is already voided')
      }

      // Update sale status
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { status: 'void' },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
          member: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Reverse inventory for each item
      for (const item of sale.items) {
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'return',
            quantityDelta: item.quantity, // Positive to restore stock
            note: `Void sale ${sale.saleNumber}`,
          },
        })
      }

      return updatedSale
    })

    // Audit log
    await createAuditLog({
      actorUserId: user.userId,
      action: 'VOID',
      entityType: 'Sale',
      entityId: result.id,
      metadata: { saleNumber: result.saleNumber },
    })

    res.json(result)
  } catch (error) {
    console.error('Error voiding sale:', error)
    const message = error instanceof Error ? error.message : 'Failed to void sale'
    if (message === 'Sale not found') {
      return res.status(404).json({ error: message })
    }
    if (message === 'Sale is already voided') {
      return res.status(400).json({ error: message })
    }
    res.status(500).json({ error: message })
  }
})

export default router

