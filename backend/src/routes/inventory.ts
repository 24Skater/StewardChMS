import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { JwtPayload } from 'jsonwebtoken'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// Zod schemas
const adjustInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityDelta: z.number().int().refine(val => val !== 0, 'Quantity delta cannot be zero'),
  note: z.string().optional(),
})

// POST /api/inventory/adjust - Create inventory adjustment
router.post('/adjust', requireAuth, requirePermission('inventory.edit'), async (req, res) => {
  try {
    const parsed = adjustInventorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues })
    }

    const { productId, quantityDelta, note } = parsed.data

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Create adjustment transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId,
        type: 'adjustment',
        quantityDelta,
        note: note || null,
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    })

    // Audit log
    const user = req.user as JwtPayload
    await createAuditLog({
      actorUserId: user.userId,
      action: 'ADJUST_INVENTORY',
      entityType: 'InventoryTransaction',
      entityId: transaction.id,
      metadata: { productId, quantityDelta, note },
    })

    res.status(201).json(transaction)
  } catch (error) {
    console.error('Error adjusting inventory:', error)
    res.status(500).json({ error: 'Failed to adjust inventory' })
  }
})

// GET /api/inventory/summary - Get current on-hand inventory per product
router.get('/summary', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  try {
    const { activeOnly } = req.query

    // Get all products
    const productWhere: Record<string, unknown> = {}
    if (activeOnly === 'true') {
      productWhere.isActive = true
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      orderBy: { name: 'asc' },
    })

    // Get sum of inventory transactions per product
    const inventorySums = await prisma.inventoryTransaction.groupBy({
      by: ['productId'],
      _sum: {
        quantityDelta: true,
      },
    })

    // Create a map for quick lookup
    const inventoryMap = new Map(
      inventorySums.map((item: typeof inventorySums[0]) => [item.productId, item._sum.quantityDelta || 0])
    )

    // Build summary with on-hand quantities
    const summary = products.map((product: typeof products[0]) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      isActive: product.isActive,
      onHand: inventoryMap.get(product.id) || 0,
    }))

    res.json({ inventory: summary })
  } catch (error) {
    console.error('Error fetching inventory summary:', error)
    res.status(500).json({ error: 'Failed to fetch inventory summary' })
  }
})

// GET /api/inventory/transactions - Get inventory transaction history
router.get('/transactions', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  try {
    const { productId, limit = '50' } = req.query

    const where: Record<string, unknown> = {}
    if (productId) {
      where.productId = productId
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    })

    res.json({ transactions })
  } catch (error) {
    console.error('Error fetching inventory transactions:', error)
    res.status(500).json({ error: 'Failed to fetch inventory transactions' })
  }
})

export default router


