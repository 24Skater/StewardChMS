import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ============================================
// Zod Schemas (inline to avoid import issues)
// ============================================

const memberStatusSchema = z.enum(['active', 'inactive', 'visitor'])

const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  street: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  status: memberStatusSchema.optional().default('active'),
  notes: z.string().nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
})

const updateMemberSchema = createMemberSchema.partial()

const memberSearchParamsSchema = z.object({
  search: z.string().optional(),
  status: memberStatusSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Helper: Format member response
// ============================================

function formatMemberResponse(member: {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  dateOfBirth: Date | null
  status: string
  notes: string | null
  profilePhotoUrl: string | null
  createdAt: Date
  updatedAt: Date
  householdMembers?: Array<{
    id: string
    householdId: string
    relationshipType: string
    household: { name: string | null }
  }>
}, includeNotes: boolean) {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    street: member.street,
    city: member.city,
    state: member.state,
    zip: member.zip,
    dateOfBirth: member.dateOfBirth?.toISOString() ?? null,
    status: member.status,
    notes: includeNotes ? member.notes : undefined,
    profilePhotoUrl: member.profilePhotoUrl,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    households: member.householdMembers?.map(hm => ({
      id: hm.id,
      householdId: hm.householdId,
      householdName: hm.household.name,
      relationshipType: hm.relationshipType,
    })),
  }
}

// ============================================
// GET /api/members - List members with search/filter
// ============================================

router.get('/', requireAuth, requirePermission('members.read'), async (req: Request, res: Response) => {
  try {
    const parseResult = memberSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { search, status, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: {
      status?: 'active' | 'inactive' | 'visitor'
      OR?: Array<{ firstName?: { contains: string; mode: 'insensitive' }; lastName?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>
    } = {}

    if (status) {
      where.status = status as 'active' | 'inactive' | 'visitor'
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          householdMembers: {
            include: {
              household: true,
            },
          },
        },
      }),
      prisma.member.count({ where }),
    ])

    const canViewNotes = req.user?.permissions.includes('members.notes') ?? false

    res.json({
      members: members.map(m => formatMemberResponse(m, canViewNotes)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List members error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/members/:id - Get single member
// ============================================

router.get('/:id', requireAuth, requirePermission('members.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        householdMembers: {
          include: {
            household: true,
          },
        },
      },
    })

    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    const canViewNotes = req.user?.permissions.includes('members.notes') ?? false
    res.json(formatMemberResponse(member, canViewNotes))
  } catch (error) {
    console.error('Get member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/members - Create member
// ============================================

router.post('/', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const parseResult = createMemberSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check for duplicate email if provided
    if (data.email) {
      const existing = await prisma.member.findUnique({
        where: { email: data.email },
      })
      if (existing) {
        res.status(409).json({ error: 'A member with this email already exists' })
        return
      }
    }

    const member = await prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        street: data.street ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        status: data.status ?? 'active',
        notes: data.notes ?? null,
        profilePhotoUrl: data.profilePhotoUrl ?? null,
      },
      include: {
        householdMembers: {
          include: {
            household: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MEMBER_CREATED',
        entityType: 'Member',
        entityId: member.id,
        metadata: { firstName: member.firstName, lastName: member.lastName },
      },
    })

    const canViewNotes = req.user?.permissions.includes('members.notes') ?? false
    res.status(201).json(formatMemberResponse(member, canViewNotes))
  } catch (error) {
    console.error('Create member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/members/:id - Update member
// ============================================

router.put('/:id', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.member.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    const parseResult = updateMemberSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Check for duplicate email if changing
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.member.findUnique({
        where: { email: data.email },
      })
      if (emailExists) {
        res.status(409).json({ error: 'A member with this email already exists' })
        return
      }
    }

    // Check notes permission
    if (data.notes !== undefined && !req.user?.permissions.includes('members.notes')) {
      res.status(403).json({ error: 'You do not have permission to edit member notes' })
      return
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.street !== undefined && { street: data.street ?? null }),
        ...(data.city !== undefined && { city: data.city ?? null }),
        ...(data.state !== undefined && { state: data.state ?? null }),
        ...(data.zip !== undefined && { zip: data.zip ?? null }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl ?? null }),
      },
      include: {
        householdMembers: {
          include: {
            household: true,
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MEMBER_UPDATED',
        entityType: 'Member',
        entityId: member.id,
        metadata: { changes: Object.keys(data) },
      },
    })

    const canViewNotes = req.user?.permissions.includes('members.notes') ?? false
    res.json(formatMemberResponse(member, canViewNotes))
  } catch (error) {
    console.error('Update member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/members/:id - Soft delete (set inactive)
// ============================================

router.delete('/:id', requireAuth, requirePermission('members.delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.member.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    // Soft delete: set status to inactive
    await prisma.member.update({
      where: { id },
      data: { status: 'inactive' },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MEMBER_DELETED',
        entityType: 'Member',
        entityId: id,
        metadata: { firstName: existing.firstName, lastName: existing.lastName, softDelete: true },
      },
    })

    res.json({ message: 'Member deleted successfully' })
  } catch (error) {
    console.error('Delete member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/members/import - CSV Import
// ============================================

router.post('/import', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data)) {
      res.status(400).json({ error: 'Expected data to be an array of member records' })
      return
    }

    if (data.length > 1000) {
      res.status(400).json({ error: 'Maximum 1000 records per import' })
      return
    }

    const csvRowSchema = z.object({
      first_name: z.string().min(1, 'First name is required'),
      last_name: z.string().min(1, 'Last name is required'),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
    })

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; message: string }>,
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      const parseResult = csvRowSchema.safeParse(row)
      if (!parseResult.success) {
        results.failed++
        results.errors.push({
          row: rowNum,
          message: parseResult.error.errors.map(e => e.message).join(', '),
        })
        continue
      }

      const { first_name, last_name, email, phone } = parseResult.data

      // Check for duplicate email
      if (email && email.length > 0) {
        const existing = await prisma.member.findUnique({
          where: { email },
        })
        if (existing) {
          results.failed++
          results.errors.push({
            row: rowNum,
            message: `Email ${email} already exists`,
          })
          continue
        }
      }

      try {
        await prisma.member.create({
          data: {
            firstName: first_name,
            lastName: last_name,
            email: email && email.length > 0 ? email : null,
            phone: phone ?? null,
            status: 'active',
          },
        })
        results.success++
      } catch {
        results.failed++
        results.errors.push({
          row: rowNum,
          message: 'Failed to create member',
        })
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.userId,
        action: 'MEMBERS_IMPORTED',
        entityType: 'Member',
        metadata: { success: results.success, failed: results.failed },
      },
    })

    res.json(results)
  } catch (error) {
    console.error('Import members error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

