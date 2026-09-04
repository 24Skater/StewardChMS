import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { JwtPayload } from 'jsonwebtoken'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// Zod schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  priceCents: z.number().int().min(0, 'Price must be non-negative'),
  currency: z.string().default('USD'),
  isActive: z.boolean().default(true),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
})

// POST /api/products - Create product
router.post('/', requireAuth, requirePermission('inventory.edit'), async (req, res) => {
  try {
    const parsed = createProductSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues })
    }

    const { name, description, sku, priceCents, currency, isActive } = parsed.data

    // Check for duplicate name
    const existingName = await prisma.product.findFirst({ where: { name } })
    if (existingName) {
      return res.status(409).json({ error: 'A product with this name already exists' })
    }

    // Check for duplicate SKU if provided
    if (sku) {
      const existingSku = await prisma.product.findFirst({ where: { sku } })
      if (existingSku) {
        return res.status(409).json({ error: 'A product with this SKU already exists' })
      }
    }

    const product = await prisma.product.create({
      data: {
        orgId: requireOrgId(),
        name,
        description,
        sku: sku || null,
        priceCents,
        currency,
        isActive,
      },
    })

    // Audit log
    const user = req.user as JwtPayload
    await createAuditLog({
      actorUserId: user.userId,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      metadata: { name },
    })

    res.status(201).json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// GET /api/products - List products
router.get('/', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  try {
    const { active } = req.query

    const where: Record<string, unknown> = {}
    if (active === 'true') {
      where.isActive = true
    } else if (active === 'false') {
      where.isActive = false
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    res.json({ products })
  } catch (error) {
    console.error('Error listing products:', error)
    res.status(500).json({ error: 'Failed to list products' })
  }
})

// GET /api/products/:id - Get single product
router.get('/:id', requireAuth, requirePermission('inventory.view'), async (req, res) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

// PUT /api/products/:id - Update product
router.put('/:id', requireAuth, requirePermission('inventory.edit'), async (req, res) => {
  try {
    const { id } = req.params
    const parsed = updateProductSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues })
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const { name, description, sku, priceCents, currency, isActive } = parsed.data

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      const existingName = await prisma.product.findFirst({ where: { name } })
      if (existingName) {
        return res.status(409).json({ error: 'A product with this name already exists' })
      }
    }

    // Check for duplicate SKU if changing
    if (sku !== undefined && sku !== existing.sku) {
      if (sku) {
        const existingSku = await prisma.product.findFirst({ where: { sku } })
        if (existingSku) {
          return res.status(409).json({ error: 'A product with this SKU already exists' })
        }
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(priceCents !== undefined && { priceCents }),
        ...(currency !== undefined && { currency }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    // Audit log
    const user = req.user as JwtPayload
    await createAuditLog({
      actorUserId: user.userId,
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product.id,
      metadata: { changes: Object.keys(parsed.data) },
    })

    res.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// DELETE /api/products/:id - Soft delete product (set isActive=false)
router.delete('/:id', requireAuth, requirePermission('inventory.edit'), async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Soft delete by setting isActive = false
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    // Audit log
    const user = req.user as JwtPayload
    await createAuditLog({
      actorUserId: user.userId,
      action: 'DELETE',
      entityType: 'Product',
      entityId: product.id,
      metadata: { softDelete: true },
    })

    res.json({ message: 'Product deactivated', product })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router


