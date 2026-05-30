import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma.js'

const router = Router()

const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

// ============================================
// GET /public/schedule/:token
// No auth required — token-based access
// ============================================
router.get('/:token', publicRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    const calendar = await prisma.ministryCalendar.findUnique({
      where: { shareToken: token },
    })

    if (!calendar || !calendar.isActive) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        slotDate: { gte: now, lte: cutoff },
        period: { calendarId: calendar.id, status: 'PUBLISHED' },
      },
      include: {
        assignment: {
          include: { member: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { slotDate: 'asc' },
    })

    res.json({
      calendarName: calendar.name,
      slots: slots.map(s => ({
        slotDate: s.slotDate.toISOString().split('T')[0],
        label: s.label,
        assignedMember: s.assignment
          ? `${s.assignment.member.firstName} ${s.assignment.member.lastName.charAt(0)}.`
          : null,
      })),
    })
  } catch (error) {
    console.error('Public schedule error:', error)
    res.status(500).json({ error: 'Failed to load schedule' })
  }
})

export default router
