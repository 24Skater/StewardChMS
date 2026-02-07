import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { getProviderForChannel } from '../providers/messaging/index.js'

// Type aliases for Prisma enums (to avoid import issues with generated client)
type MessageChannel = 'email' | 'sms'
type MemberStatus = 'active' | 'inactive' | 'visitor'
type DeliveryStatus = 'pending' | 'sent' | 'failed'

// Type for Prisma transaction client
type TransactionClient = Prisma.TransactionClient

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const messageTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({
    type: z.literal('memberIds'),
    memberIds: z.array(z.string()).min(1, 'At least one member ID is required'),
  }),
  z.object({
    type: z.literal('status'),
    status: z.enum(['active', 'inactive', 'visitor']),
  }),
])

const createMessageSchema = z.object({
  channel: z.enum(['email', 'sms']),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1, 'Message body is required'),
  target: messageTargetSchema,
})

const messageSearchParamsSchema = z.object({
  channel: z.enum(['email', 'sms']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

const recipientSearchParamsSchema = z.object({
  status: z.enum(['pending', 'sent', 'failed']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

// ============================================
// Helper: Format message response
// ============================================

function formatMessageResponse(message: {
  id: string
  channel: MessageChannel
  subject: string | null
  body: string
  createdByUserId: string
  createdAt: Date
  createdByUser?: { id: string; name: string | null; email: string } | null
  _count?: { recipients: number }
}) {
  return {
    id: message.id,
    channel: message.channel,
    subject: message.subject,
    body: message.body,
    createdByUserId: message.createdByUserId,
    createdAt: message.createdAt.toISOString(),
    ...(message.createdByUser && { createdByUser: message.createdByUser }),
    ...(message._count && { _count: message._count }),
  }
}

// ============================================
// Helper: Variable substitution
// ============================================

function substituteVariables(
  body: string,
  member: { firstName: string; lastName: string; email?: string | null }
): string {
  return body
    .replace(/\{\{firstName\}\}/gi, member.firstName)
    .replace(/\{\{lastName\}\}/gi, member.lastName)
    .replace(/\{\{email\}\}/gi, member.email || '')
}

// ============================================
// Helper: Process message delivery (async simulation)
// ============================================

async function processMessageDelivery(
  messageId: string,
  channel: MessageChannel,
  subject: string | null,
  body: string
) {
  const recipients = await prisma.messageRecipient.findMany({
    where: { messageId, deliveryStatus: 'pending' },
    include: { member: true },
  })

  const provider = getProviderForChannel(channel)

  for (const recipient of recipients) {
    try {
      let contactInfo: string | null = null
      let personalizedBody = body

      if (recipient.member) {
        // Check opt-in preference
        const optIn = await prisma.optInPreference.findUnique({
          where: {
            memberId_channel: {
              memberId: recipient.member.id,
              channel,
            },
          },
        })

        // Default to opted in if no preference exists
        if (optIn && !optIn.isOptedIn) {
          await prisma.messageRecipient.update({
            where: { id: recipient.id },
            data: {
              deliveryStatus: 'failed',
              errorMessage: 'Member opted out of this channel',
            },
          })
          continue
        }

        contactInfo = channel === 'email' ? recipient.member.email : recipient.member.phone
        personalizedBody = substituteVariables(body, recipient.member)
      } else if (recipient.guestContact) {
        const guest = recipient.guestContact as { name?: string; email?: string; phone?: string }
        contactInfo = channel === 'email' ? guest.email || null : guest.phone || null
        if (guest.name) {
          personalizedBody = body.replace(/\{\{firstName\}\}/gi, guest.name)
        }
      }

      if (!contactInfo) {
        await prisma.messageRecipient.update({
          where: { id: recipient.id },
          data: {
            deliveryStatus: 'failed',
            errorMessage: `No ${channel} contact info available`,
          },
        })
        continue
      }

      // Send via provider
      const result = await provider.send(contactInfo, subject, personalizedBody)

      await prisma.messageRecipient.update({
        where: { id: recipient.id },
        data: {
          deliveryStatus: result.success ? 'sent' : 'failed',
          deliveredAt: result.success ? new Date() : null,
          errorMessage: result.error || null,
        },
      })
    } catch (error) {
      console.error(`Error sending to recipient ${recipient.id}:`, error)
      await prisma.messageRecipient.update({
        where: { id: recipient.id },
        data: {
          deliveryStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }
}

// ============================================
// POST /api/messages - Create and send message
// ============================================

router.post('/', requireAuth, requirePermission('communications.send'), async (req: Request, res: Response) => {
  try {
    const parseResult = createMessageSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { channel, subject, body, target } = parseResult.data
    const userId = req.user!.userId

    // Build member query based on target
    let memberWhere: { id?: { in: string[] }; status?: MemberStatus } = {}

    if (target.type === 'all') {
      // All active members
      memberWhere = { status: 'active' as MemberStatus }
    } else if (target.type === 'memberIds') {
      memberWhere = { id: { in: target.memberIds } }
    } else if (target.type === 'status') {
      memberWhere = { status: target.status as MemberStatus }
    }

    // Get members based on target
    const members = await prisma.member.findMany({
      where: memberWhere,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    })

    // Filter members based on contact info availability
    const validMembers = members.filter((m: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }) => {
      if (channel === 'email') return !!m.email
      return !!m.phone
    })

    if (validMembers.length === 0) {
      res.status(400).json({
        error: 'No recipients',
        message: `No members found with ${channel} contact information`,
      })
      return
    }

    // Create message and recipients in a transaction
    const message = await prisma.$transaction(async (tx: TransactionClient) => {
      const newMessage = await tx.message.create({
        data: {
          channel: channel as MessageChannel,
          subject: subject ?? null,
          body,
          createdByUserId: userId,
        },
      })

      // Create recipients
      await tx.messageRecipient.createMany({
        data: validMembers.map((member: { id: string }) => ({
          messageId: newMessage.id,
          memberId: member.id,
          deliveryStatus: 'pending' as DeliveryStatus,
        })),
      })

      return newMessage
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'MESSAGE_SENT',
        entityType: 'Message',
        entityId: message.id,
        metadata: {
          channel,
          recipientCount: validMembers.length,
          targetType: target.type,
        },
      },
    })

    // Process delivery asynchronously (simulate background job)
    // Don't await - let it run in background
    processMessageDelivery(message.id, message.channel, message.subject, message.body)
      .catch(err => console.error('Message delivery error:', err))

    // Return immediate response
    const messageWithCount = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        _count: { select: { recipients: true } },
      },
    })

    res.status(201).json(formatMessageResponse(messageWithCount!))
  } catch (error) {
    console.error('Create message error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/messages - List messages
// ============================================

router.get('/', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const parseResult = messageSearchParamsSchema.safeParse(req.query)
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

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: { select: { id: true, name: true, email: true } },
          _count: { select: { recipients: true } },
        },
      }),
      prisma.message.count({ where }),
    ])

    res.json({
      messages: messages.map(formatMessageResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('List messages error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/messages/:id - Get single message
// ============================================

router.get('/:id', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        _count: { select: { recipients: true } },
      },
    })

    if (!message) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    res.json(formatMessageResponse(message))
  } catch (error) {
    console.error('Get message error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/messages/:id/recipients - Get message recipients
// ============================================

router.get('/:id/recipients', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const message = await prisma.message.findUnique({ where: { id } })
    if (!message) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const parseResult = recipientSearchParamsSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { status, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where = {
      messageId: id,
      ...(status && { deliveryStatus: status as DeliveryStatus }),
    }

    const [recipients, total] = await Promise.all([
      prisma.messageRecipient.findMany({
        where,
        skip,
        take: limit,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { deliveryStatus: 'asc' },
      }),
      prisma.messageRecipient.count({ where }),
    ])

    res.json({
      recipients: recipients.map((r: typeof recipients[0]) => ({
        id: r.id,
        messageId: r.messageId,
        memberId: r.memberId,
        guestContact: r.guestContact,
        deliveryStatus: r.deliveryStatus,
        deliveredAt: r.deliveredAt?.toISOString() || null,
        errorMessage: r.errorMessage,
        member: r.member,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get message recipients error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/messages/:id/stats - Get delivery stats
// ============================================

router.get('/:id/stats', requireAuth, requirePermission('communications.view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const message = await prisma.message.findUnique({ where: { id } })
    if (!message) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const stats = await prisma.messageRecipient.groupBy({
      by: ['deliveryStatus'],
      where: { messageId: id },
      _count: true,
    })

    const result: Record<string, number> = {
      pending: 0,
      sent: 0,
      failed: 0,
      total: 0,
    }

    for (const s of stats) {
      result[s.deliveryStatus as string] = s._count
      result.total += s._count
    }

    res.json(result)
  } catch (error) {
    console.error('Get message stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

