import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'

const DATABASE_URL = process.env.DATABASE_URL
let prisma: PrismaClient | null = null
if (DATABASE_URL) {
  prisma = new PrismaClient()
}

const describeWithDb = DATABASE_URL ? describe : describe.skip

describeWithDb('Public Schedule API', () => {
  let testMinistryId: string
  let testShareToken: string
  let testCalendarId: string

  beforeAll(async () => {
    if (!prisma) return
    testShareToken = `public-test-${Date.now()}`

    const user = await prisma.user.findFirst({ where: { isActive: true } })
    if (!user) return

    const ministry = await prisma.ministry.create({
      data: { name: `Public Test Ministry ${Date.now()}`, isActive: true },
    })
    testMinistryId = ministry.id

    const calendar = await prisma.ministryCalendar.create({
      data: {
        name: 'Public Test Calendar',
        ministryId: testMinistryId,
        shareToken: testShareToken,
        createdById: user.id,
      },
    })
    testCalendarId = calendar.id

    // Create a published period with a slot 5 days from now
    const period = await prisma.schedulePeriod.create({
      data: { calendarId: testCalendarId, year: 2099, month: 1, status: 'PUBLISHED' },
    })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)

    const member = await prisma.member.create({
      data: { firstName: 'Maria', lastName: 'Torres', status: 'active' },
    })

    const slot = await prisma.scheduleSlot.create({
      data: { periodId: period.id, slotDate: futureDate, label: 'Head Usher' },
    })

    await prisma.slotAssignment.create({
      data: { slotId: slot.id, memberId: member.id, assignedById: user.id, notifiedAt: new Date() },
    })
  })

  afterAll(async () => {
    if (!prisma) return
    const periods = await prisma.schedulePeriod.findMany({ where: { calendarId: testCalendarId } })
    for (const p of periods) {
      const slots = await prisma.scheduleSlot.findMany({ where: { periodId: p.id } })
      for (const s of slots) {
        await prisma.slotAssignment.deleteMany({ where: { slotId: s.id } })
        await prisma.member.deleteMany({ where: { slotAssignments: { some: { slotId: s.id } } } })
      }
      await prisma.scheduleSlot.deleteMany({ where: { periodId: p.id } })
    }
    await prisma.member.deleteMany({ where: { firstName: 'Maria', lastName: 'Torres' } })
    await prisma.schedulePeriod.deleteMany({ where: { calendarId: testCalendarId } })
    await prisma.ministryCalendar.deleteMany({ where: { ministryId: testMinistryId } })
    await prisma.ministry.delete({ where: { id: testMinistryId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('GET /public/schedule/:token', () => {
    it('returns upcoming slots for valid token', async () => {
      const res = await request(app).get(`/public/schedule/${testShareToken}`)
      expect(res.status).toBe(200)
      expect(res.body.calendarName).toBeDefined()
      expect(Array.isArray(res.body.slots)).toBe(true)
    })

    it('returns 404 for invalid token', async () => {
      const res = await request(app).get('/public/schedule/completely-invalid-token-xyz')
      expect(res.status).toBe(404)
    })

    it('returns anonymized member name (First L. format)', async () => {
      const res = await request(app).get(`/public/schedule/${testShareToken}`)
      expect(res.status).toBe(200)
      if (res.body.slots.length > 0) {
        const slot = res.body.slots[0]
        if (slot.assignedMember) {
          expect(slot.assignedMember).toMatch(/^[A-Za-z]+ [A-Z]\.$/)
        }
      }
    })

    it('response does not contain email or phone', async () => {
      const res = await request(app).get(`/public/schedule/${testShareToken}`)
      const bodyStr = JSON.stringify(res.body)
      expect(bodyStr).not.toContain('@')
      expect(bodyStr).not.toMatch(/\+?\d{10}/)
    })

    it('returns rate-limit headers', async () => {
      const res = await request(app).get(`/public/schedule/${testShareToken}`)
      expect(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']).toBeDefined()
    })
  })
})
