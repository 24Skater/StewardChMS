import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// GET /api/reports/funds-summary - Fund balance summary
router.get('/funds-summary', requireAuth, requirePermission('accounting.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    // Get all funds
    const funds = await prisma.fund.findMany({
      orderBy: { name: 'asc' },
    })

    // Get donations grouped by fund
    const donations = await prisma.donation.groupBy({
      by: ['fundId'],
      where: {
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amountCents: true,
      },
    })

    // Get expenses grouped by fund
    const expenses = await prisma.expense.groupBy({
      by: ['fundId'],
      where: {
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amountCents: true,
      },
    })

    // Create a map of fund balances
    const donationsByFund = new Map(donations.map(d => [d.fundId, d._sum.amountCents || 0]))
    const expensesByFund = new Map(expenses.map(e => [e.fundId, e._sum.amountCents || 0]))

    // Calculate per-fund balances
    const fundBalances: Array<{
      fundId: string | null
      fundName: string | null
      incomeCents: number
      expensesCents: number
      netCents: number
    }> = funds.map(fund => {
      const incomeCents = donationsByFund.get(fund.id) || 0
      const expensesCents = expensesByFund.get(fund.id) || 0
      return {
        fundId: fund.id,
        fundName: fund.name,
        incomeCents,
        expensesCents,
        netCents: incomeCents - expensesCents,
      }
    })

    // Add undesignated (null fund) totals
    const undesignatedIncome = donationsByFund.get(null) || 0
    const undesignatedExpenses = expensesByFund.get(null) || 0
    if (undesignatedIncome > 0 || undesignatedExpenses > 0) {
      fundBalances.push({
        fundId: null,
        fundName: 'Undesignated',
        incomeCents: undesignatedIncome,
        expensesCents: undesignatedExpenses,
        netCents: undesignatedIncome - undesignatedExpenses,
      })
    }

    // Calculate totals
    const totalIncome = fundBalances.reduce((sum, f) => sum + f.incomeCents, 0)
    const totalExpenses = fundBalances.reduce((sum, f) => sum + f.expensesCents, 0)

    res.json({
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      funds: fundBalances,
      totals: {
        incomeCents: totalIncome,
        expensesCents: totalExpenses,
        netCents: totalIncome - totalExpenses,
      },
    })
  } catch (error) {
    console.error('Error generating fund summary:', error)
    res.status(500).json({ error: 'Failed to generate fund summary' })
  }
})

// GET /api/reports/giving-summary - Donor giving summary
router.get('/giving-summary', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, memberId } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    const where: Record<string, unknown> = {
      receivedAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (memberId) {
      where.memberId = memberId
    }

    // Get donations with member info
    const donations = await prisma.donation.findMany({
      where,
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    // Group by donor (member or guest)
    const donorMap = new Map<string, {
      memberId: string | null
      memberName: string | null
      guestName: string | null
      totalCents: number
      donationCount: number
    }>()

    for (const donation of donations) {
      const key = donation.memberId || `guest:${donation.guestName || 'Anonymous'}`
      const existing = donorMap.get(key)

      if (existing) {
        existing.totalCents += donation.amountCents
        existing.donationCount += 1
      } else {
        donorMap.set(key, {
          memberId: donation.memberId,
          memberName: donation.member 
            ? `${donation.member.firstName} ${donation.member.lastName}`
            : null,
          guestName: donation.memberId ? null : (donation.guestName || 'Anonymous'),
          totalCents: donation.amountCents,
          donationCount: 1,
        })
      }
    }

    // Convert to array and sort by total
    const donors = Array.from(donorMap.values()).sort((a, b) => b.totalCents - a.totalCents)

    const totalCents = donors.reduce((sum, d) => sum + d.totalCents, 0)
    const totalDonations = donors.reduce((sum, d) => sum + d.donationCount, 0)

    res.json({
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      donors,
      totalCents,
      totalDonations,
    })
  } catch (error) {
    console.error('Error generating giving summary:', error)
    res.status(500).json({ error: 'Failed to generate giving summary' })
  }
})

// GET /api/reports/donor-statement - Individual donor statement for a year
router.get('/donor-statement', requireAuth, requirePermission('giving.view'), async (req, res) => {
  try {
    const { memberId, year } = req.query

    if (!memberId || !year) {
      return res.status(400).json({ error: 'memberId and year are required' })
    }

    const yearNum = parseInt(year as string, 10)
    const startDate = new Date(yearNum, 0, 1)
    const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999)

    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberId as string },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        street: true,
        city: true,
        state: true,
        zip: true,
      },
    })

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Get donations for the year
    const donations = await prisma.donation.findMany({
      where: {
        memberId: memberId as string,
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        fund: {
          select: { name: true },
        },
      },
      orderBy: { receivedAt: 'asc' },
    })

    const totalCents = donations.reduce((sum, d) => sum + d.amountCents, 0)

    res.json({
      member,
      year: yearNum,
      donations: donations.map(d => ({
        id: d.id,
        receivedAt: d.receivedAt.toISOString(),
        amountCents: d.amountCents,
        fundName: d.fund?.name ?? null,
        method: d.method,
      })),
      totalCents,
    })
  } catch (error) {
    console.error('Error generating donor statement:', error)
    res.status(500).json({ error: 'Failed to generate donor statement' })
  }
})

export default router
