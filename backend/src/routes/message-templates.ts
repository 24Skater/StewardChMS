import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

// Type alias for Prisma enum
type MessageChannel = 'email' | 'sms'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  channel: z.enum(['email', 'sms']),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1, 'Template body is required'),
})

const updateTemplateSchema = createTemplateSchema.partial()

const templateSearchParamsSchema = z.object({
  channel: z.enum(['email', 'sms']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Helper: Format template response
// ============================================

function formatTemplateResponse(template: {
  id: string
  name: string
  channel: MessageChannel
  subject: string | null
  body: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: template.id,
    name: template.name,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

// ============================================
// POST /api/message-templates - Create template
// ============================================

router.post('/', requireAuth, requirePermission('communications.send'), async (req: Request, res: Response) => {
  try {
    const parseResult = createTemplateSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const template = await prisma.messageTemplate.create({
      data: {
        name: data.name,
        channel: data.channel as MessageChannel,
        subject: data.subject ?? null,
        body: data.body,
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'MESSAGE_TEMPLATE_CREATED',
      entityType: 'MessageTemplate',
      entityId: template.id,
      metadata: { name: template.name, channel: template.channel },
    })

    res.status(201).json(formatTemplateResponse(template))
  } catch (error) {
    console.error('Create message template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/message-templates - List templates
// ============================================

router.get('/', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const parseResult = templateSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { channel, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where = channel ? { channel: channel as MessageChannel } : {}

    const [templates, total] = await Promise.all([
      prisma.messageTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.messageTemplate.count({ where }),
    ])

    res.json({
      templates: templates.map(formatTemplateResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List message templates error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/message-templates/:id - Get single template
// ============================================

router.get('/:id', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const template = await prisma.messageTemplate.findUnique({ where: { id } })
    if (!template) {
      res.status(404).json({ error: 'Message template not found' })
      return
    }

    res.json(formatTemplateResponse(template))
  } catch (error) {
    console.error('Get message template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/message-templates/:id - Update template
// ============================================

router.put('/:id', requireAuth, requirePermission('communications.send'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.messageTemplate.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Message template not found' })
      return
    }

    const parseResult = updateTemplateSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.channel !== undefined && { channel: data.channel as MessageChannel }),
        ...(data.subject !== undefined && { subject: data.subject ?? null }),
        ...(data.body !== undefined && { body: data.body }),
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'MESSAGE_TEMPLATE_UPDATED',
      entityType: 'MessageTemplate',
      entityId: template.id,
      metadata: { changes: Object.keys(data) },
    })

    res.json(formatTemplateResponse(template))
  } catch (error) {
    console.error('Update message template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /api/message-templates/:id - Delete template
// ============================================

router.delete('/:id', requireAuth, requirePermission('communications.send'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const existing = await prisma.messageTemplate.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Message template not found' })
      return
    }

    await prisma.messageTemplate.delete({ where: { id } })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'MESSAGE_TEMPLATE_DELETED',
      entityType: 'MessageTemplate',
      entityId: id,
      metadata: { name: existing.name },
    })

    res.json({ message: 'Message template deleted successfully' })
  } catch (error) {
    console.error('Delete message template error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

