import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(100),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  street: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
})

const updateVendorSchema = createVendorSchema.partial()

// ============================================
// Routes
// ============================================

// GET /api/vendors - List all vendors
router.get('/', requireAuth, requirePermission('accounting.view'), async (_req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    })

    res.json({
      vendors: vendors.map(v => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      total: vendors.length,
    })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    res.status(500).json({ error: 'Failed to fetch vendors' })
  }
})

// GET /api/vendors/:id - Get a single vendor
router.get('/:id', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
    })

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }

    res.json({
      ...vendor,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching vendor:', error)
    res.status(500).json({ error: 'Failed to fetch vendor' })
  }
})

// POST /api/vendors - Create a new vendor
router.post('/', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = createVendorSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const { name, email, phone, street, city, state, zip } = parsed.data

    // Check for duplicate name
    const existing = await prisma.vendor.findUnique({ where: { name } })
    if (existing) {
      return res.status(409).json({ error: 'A vendor with this name already exists' })
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        street: street ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'CREATE_VENDOR',
        entityType: 'Vendor',
        entityId: vendor.id,
        metadata: { name },
      },
    })

    res.status(201).json({
      ...vendor,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating vendor:', error)
    res.status(500).json({ error: 'Failed to create vendor' })
  }
})

// PUT /api/vendors/:id - Update a vendor
router.put('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const parsed = updateVendorSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.flatten().fieldErrors 
      })
    }

    const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Vendor not found' })
    }

    const { name, email, phone, street, city, state, zip } = parsed.data

    // Check for duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.vendor.findUnique({ where: { name } })
      if (duplicate) {
        return res.status(409).json({ error: 'A vendor with this name already exists' })
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(street !== undefined && { street }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zip !== undefined && { zip }),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'UPDATE_VENDOR',
        entityType: 'Vendor',
        entityId: vendor.id,
        metadata: { changes: parsed.data },
      },
    })

    res.json({
      ...vendor,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating vendor:', error)
    res.status(500).json({ error: 'Failed to update vendor' })
  }
})

// DELETE /api/vendors/:id - Delete a vendor (only if no dependencies)
router.delete('/:id', requireAuth, requirePermission('accounting.edit'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            expenses: true,
            invoices: true,
            purchaseOrders: true,
          },
        },
      },
    })

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' })
    }

    // Check for dependencies
    const totalDependencies = vendor._count.expenses + vendor._count.invoices + vendor._count.purchaseOrders
    if (totalDependencies > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete vendor with existing expenses, invoices, or purchase orders',
        details: {
          expenses: vendor._count.expenses,
          invoices: vendor._count.invoices,
          purchaseOrders: vendor._count.purchaseOrders,
        }
      })
    }

    await prisma.vendor.delete({ where: { id: req.params.id } })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.userId,
        action: 'DELETE_VENDOR',
        entityType: 'Vendor',
        entityId: req.params.id,
        metadata: { name: vendor.name },
      },
    })

    res.json({ message: 'Vendor deleted successfully' })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    res.status(500).json({ error: 'Failed to delete vendor' })
  }
})

export default router
