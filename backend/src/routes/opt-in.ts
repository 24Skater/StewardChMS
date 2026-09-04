import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

// Type alias for Prisma enum
type MessageChannel = 'email' | 'sms'

const router = Router()

// ============================================
// Zod Schemas
// ============================================

const updateOptInSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
})

// ============================================
// GET /api/members/:id/opt-in - Get member opt-in preferences
// ============================================

router.get('/members/:id/opt-in', requireAuth, requirePermission('members.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const member = await prisma.member.findUnique({ where: { id } })
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    const preferences = await prisma.optInPreference.findMany({
      where: { memberId: id },
    })

    // Build response with defaults (opted in if no preference exists)
    const result = {
      email: true,
      sms: true,
    }

    for (const pref of preferences) {
      if (pref.channel === 'email') result.email = pref.isOptedIn
      if (pref.channel === 'sms') result.sms = pref.isOptedIn
    }

    res.json(result)
  } catch (error) {
    console.error('Get opt-in preferences error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /api/members/:id/opt-in - Update member opt-in preferences
// ============================================

router.put('/members/:id/opt-in', requireAuth, requirePermission('members.write'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const member = await prisma.member.findUnique({ where: { id } })
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }

    const parseResult = updateOptInSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { email, sms } = parseResult.data

    // Update preferences
    const updates: Array<{ channel: MessageChannel; isOptedIn: boolean }> = []

    if (email !== undefined) {
      updates.push({ channel: 'email', isOptedIn: email })
    }
    if (sms !== undefined) {
      updates.push({ channel: 'sms', isOptedIn: sms })
    }

    // Upsert each preference
    for (const update of updates) {
      await prisma.optInPreference.upsert({
        where: {
          memberId_channel: {
            memberId: id,
            channel: update.channel,
          },
        },
        update: { isOptedIn: update.isOptedIn },
        create: {
          orgId: requireOrgId(),
          memberId: id,
          channel: update.channel,
          isOptedIn: update.isOptedIn,
        },
      })
    }

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'OPT_IN_UPDATED',
      entityType: 'Member',
      entityId: id,
      metadata: { changes: parseResult.data },
    })

    // Return updated preferences
    const preferences = await prisma.optInPreference.findMany({
      where: { memberId: id },
    })

    const result = {
      email: true,
      sms: true,
    }

    for (const pref of preferences) {
      if (pref.channel === 'email') result.email = pref.isOptedIn
      if (pref.channel === 'sms') result.sms = pref.isOptedIn
    }

    res.json(result)
  } catch (error) {
    console.error('Update opt-in preferences error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

