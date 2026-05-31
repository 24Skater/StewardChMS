import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { apiRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// ============================================
// Helper: anonymize member name to "First L." format
// ============================================

function anonymizeName(firstName: string, lastName: string): string {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!last) return first
  return `${first} ${last[0]}.`
}

// ============================================
// GET /public/schedule/:token
// Public kiosk endpoint — NO auth required
// ============================================

router.get('/:token', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    // Look up calendar by share token (unique index — no timing differences)
    const calendar = await prisma.ministryCalendar.findUnique({
      where: { shareToken: token },
    })

    if (!calendar || !calendar.isActive) {
      res.status(404).json({ error: 'Schedule not found' })
      return
    }

    const now = new Date()
    const future = new Date(now)
    future.setDate(future.getDate() + 30)

    // Find all slots within the next 30 days that belong to a published period of this calendar
    // and have an assignment
    const slots = await prisma.scheduleSlot.findMany({
      where: {
        slotDate: {
          gte: now,
          lte: future,
        },
        assignment: {
          isNot: null,
        },
        period: {
          calendarId: calendar.id,
          status: 'PUBLISHED',
        },
      },
      include: {
        assignment: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { slotDate: 'asc' },
    })

    const data = slots
      .filter(slot => slot.assignment !== null)
      .map(slot => {
        const member = slot.assignment!.member
        return {
          slotDate: slot.slotDate.toISOString().split('T')[0], // "YYYY-MM-DD"
          label: slot.label ?? null,
          assignedMember: anonymizeName(member.firstName, member.lastName),
        }
      })

    res.json({ success: true, calendarName: calendar.name, data })
  } catch (error) {
    console.error('Error fetching public schedule:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
