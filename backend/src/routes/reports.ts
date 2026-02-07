import { Router, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// CSV export helper
function sendCSV(res: Response, filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csvContent)
}

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
    const donationsByFund = new Map<string | null, number>(
      donations.map((d: typeof donations[0]) => [d.fundId, d._sum.amountCents || 0])
    )
    const expensesByFund = new Map<string | null, number>(
      expenses.map((e: typeof expenses[0]) => [e.fundId, e._sum.amountCents || 0])
    )

    // Calculate per-fund balances
    const fundBalances: Array<{
      fundId: string | null
      fundName: string | null
      incomeCents: number
      expensesCents: number
      netCents: number
    }> = funds.map((fund: typeof funds[0]) => {
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
    const undesignatedIncome: number = donationsByFund.get(null) || 0
    const undesignatedExpenses: number = expensesByFund.get(null) || 0
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

    const totalCents = donations.reduce((sum: number, d: typeof donations[0]) => sum + d.amountCents, 0)

    res.json({
      member,
      year: yearNum,
      donations: donations.map((d: typeof donations[0]) => ({
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

// ============================================
// Phase 6 Report Endpoints
// ============================================

// GET /api/reports/membership-summary - Membership statistics
router.get('/membership-summary', requireAuth, requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, format } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    // Total members by status
    const membersByStatus = await prisma.member.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    // New members added in date range
    const newMembers = await prisma.member.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Members missing email
    const missingEmail = await prisma.member.count({
      where: {
        email: null,
        status: 'active',
      },
    })

    // Members missing phone
    const missingPhone = await prisma.member.count({
      where: {
        phone: null,
        status: 'active',
      },
    })

    // Total active members
    const totalActive = membersByStatus.find((s: typeof membersByStatus[0]) => s.status === 'active')?._count.id || 0
    const totalInactive = membersByStatus.find((s: typeof membersByStatus[0]) => s.status === 'inactive')?._count.id || 0
    const totalVisitor = membersByStatus.find((s: typeof membersByStatus[0]) => s.status === 'visitor')?._count.id || 0

    const result = {
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      byStatus: {
        active: totalActive,
        inactive: totalInactive,
        visitor: totalVisitor,
      },
      newMembersInPeriod: newMembers,
      missingFields: {
        email: missingEmail,
        phone: missingPhone,
      },
      totalMembers: totalActive + totalInactive + totalVisitor,
    }

    if (format === 'csv') {
      const headers = ['Metric', 'Value']
      const rows = [
        ['Active Members', String(totalActive)],
        ['Inactive Members', String(totalInactive)],
        ['Visitors', String(totalVisitor)],
        ['Total Members', String(result.totalMembers)],
        ['New Members (Period)', String(newMembers)],
        ['Missing Email', String(missingEmail)],
        ['Missing Phone', String(missingPhone)],
      ]
      return sendCSV(res, 'membership-summary.csv', headers, rows)
    }

    res.json(result)
  } catch (error) {
    console.error('Error generating membership summary:', error)
    res.status(500).json({ error: 'Failed to generate membership summary' })
  }
})

// GET /api/reports/attendance-summary - Attendance statistics
router.get('/attendance-summary', requireAuth, requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, format } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    // Get occurrences with check-in counts
    const occurrences = await prisma.eventOccurrence.findMany({
      where: {
        startsAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        event: {
          select: { id: true, title: true },
        },
        _count: {
          select: { checkIns: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    })

    // Total check-ins in period
    const totalCheckIns = occurrences.reduce((sum: number, occ: typeof occurrences[0]) => sum + occ._count.checkIns, 0)

    // Top events by attendance
    const eventAttendance = new Map<string, { title: string; checkIns: number }>()
    for (const occ of occurrences) {
      const existing = eventAttendance.get(occ.event.id)
      if (existing) {
        existing.checkIns += occ._count.checkIns
      } else {
        eventAttendance.set(occ.event.id, {
          title: occ.event.title,
          checkIns: occ._count.checkIns,
        })
      }
    }

    const topEvents = Array.from(eventAttendance.entries())
      .map(([eventId, data]) => ({ eventId, ...data }))
      .sort((a, b) => b.checkIns - a.checkIns)
      .slice(0, 10)

    const result = {
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      totalCheckIns,
      occurrenceCount: occurrences.length,
      topEvents,
      occurrences: occurrences.map((occ: typeof occurrences[0]) => ({
        occurrenceId: occ.id,
        eventTitle: occ.event.title,
        startsAt: occ.startsAt.toISOString(),
        checkIns: occ._count.checkIns,
      })),
    }

    if (format === 'csv') {
      const headers = ['Event', 'Date', 'Check-ins']
      const rows = occurrences.map((occ: typeof occurrences[0]) => [
        occ.event.title,
        occ.startsAt.toISOString().split('T')[0],
        String(occ._count.checkIns),
      ])
      return sendCSV(res, 'attendance-summary.csv', headers, rows)
    }

    res.json(result)
  } catch (error) {
    console.error('Error generating attendance summary:', error)
    res.status(500).json({ error: 'Failed to generate attendance summary' })
  }
})

// GET /api/reports/giving-report - Public giving report (fund totals only, no donor names)
router.get('/giving-report', requireAuth, requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, format } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    // Get donations grouped by fund
    const donations = await prisma.donation.groupBy({
      by: ['fundId'],
      where: {
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amountCents: true },
      _count: { id: true },
    })

    // Get fund names
    const fundIds = donations.map((d: typeof donations[0]) => d.fundId).filter((id: string | null): id is string => id !== null)
    const funds = await prisma.fund.findMany({
      where: { id: { in: fundIds } },
    })
    const fundMap = new Map(funds.map((f: typeof funds[0]) => [f.id, f.name]))

    const fundTotals = donations.map((d: typeof donations[0]) => ({
      fundId: d.fundId,
      fundName: d.fundId ? (fundMap.get(d.fundId) || 'Unknown') : 'Undesignated',
      totalCents: d._sum.amountCents || 0,
      donationCount: d._count.id,
    })).sort((a: { totalCents: number }, b: { totalCents: number }) => b.totalCents - a.totalCents)

    const totalCents = fundTotals.reduce((sum: number, f: { totalCents: number }) => sum + f.totalCents, 0)
    const totalDonations = fundTotals.reduce((sum: number, f: { donationCount: number }) => sum + f.donationCount, 0)

    const result = {
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      fundTotals,
      totalCents,
      totalDonations,
    }

    if (format === 'csv') {
      const headers = ['Fund', 'Donations', 'Total ($)']
      const rows = fundTotals.map((f: { fundName: string; donationCount: number; totalCents: number }) => [
        f.fundName,
        String(f.donationCount),
        (f.totalCents / 100).toFixed(2),
      ])
      rows.push(['TOTAL', String(totalDonations), (totalCents / 100).toFixed(2)])
      return sendCSV(res, 'giving-report.csv', headers, rows)
    }

    res.json(result)
  } catch (error) {
    console.error('Error generating giving report:', error)
    res.status(500).json({ error: 'Failed to generate giving report' })
  }
})

// GET /api/reports/volunteer-summary - Placeholder for volunteer assignments report
router.get('/volunteer-summary', requireAuth, requirePermission('reports.view'), async (_req, res) => {
  res.json({
    message: 'Volunteer/assignments report not yet implemented',
    status: 'placeholder',
    note: 'This report will be available when the volunteer management module is completed',
  })
})

// GET /api/reports/sales-summary - Sales statistics
router.get('/sales-summary', requireAuth, requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, format } = req.query

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' })
    }

    const startDate = new Date(dateFrom as string)
    const endDate = new Date(dateTo as string)

    // Get sales in period (completed only)
    const sales = await prisma.sale.findMany({
      where: {
        soldAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Calculate totals
    const totalSales = sales.length
    const totalRevenueCents = sales.reduce((sum: number, s: typeof sales[0]) => sum + s.totalCents, 0)
    const totalTaxCents = sales.reduce((sum: number, s: typeof sales[0]) => sum + s.taxCents, 0)

    // Top products by quantity sold
    const productSales = new Map<string, { name: string; quantity: number; revenueCents: number }>()
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
          existing.revenueCents += item.lineTotalCents
        } else {
          productSales.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            revenueCents: item.lineTotalCents,
          })
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10)

    const result = {
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString(),
      totalSales,
      totalRevenueCents,
      totalTaxCents,
      topProducts,
    }

    if (format === 'csv') {
      const headers = ['Product', 'Quantity Sold', 'Revenue ($)']
      const rows = topProducts.map(p => [
        p.name,
        String(p.quantity),
        (p.revenueCents / 100).toFixed(2),
      ])
      rows.push(['TOTAL', '', (totalRevenueCents / 100).toFixed(2)])
      return sendCSV(res, 'sales-summary.csv', headers, rows)
    }

    res.json(result)
  } catch (error) {
    console.error('Error generating sales summary:', error)
    res.status(500).json({ error: 'Failed to generate sales summary' })
  }
})

export default router
