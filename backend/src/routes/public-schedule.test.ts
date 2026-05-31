import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/auth.js'

// ============================================
// DB availability guard
// ============================================

const isDbAvailable = !!process.env.DATABASE_URL

// ============================================
// Token for admin operations (create calendars, periods, slots, assignments)
// ============================================

const manageToken = signToken({
  userId: 'public-sched-manage',
  email: 'public-sched-manage@test.example.com',
  roles: ['schedules-manager'],
  permissions: ['schedules.view', 'schedules.manage'],
}).accessToken

// ============================================
// Test state
// ============================================

let testMinistryId: string
let testCalendarId: string
let shareToken: string
let testMemberId: string

// Slot dates for "upcoming" and "past" slot scenarios.
// We need a date that is in the future and within the next 30 days
// AND a date in the past to verify exclusion.
const now = new Date()
const futureDate = new Date(now)
futureDate.setDate(futureDate.getDate() + 7) // 7 days from now
const pastDate = new Date(now)
pastDate.setDate(pastDate.getDate() - 7) // 7 days ago

// ============================================
// Tests
// ============================================

describe('Public Schedule API', () => {
  beforeAll(async () => {
    if (!isDbAvailable) return
    await prisma.user.upsert({
      where: { email: 'public-sched-manage@test.example.com' },
      update: {},
      create: { id: 'public-sched-manage', email: 'public-sched-manage@test.example.com', passwordHash: 'test-hash', isActive: true },
    })

    // Ministry
    const ministry = await prisma.ministry.create({
      data: { name: `Public Schedule Ministry ${Date.now()}` },
    })
    testMinistryId = ministry.id

    // Calendar
    const calRes = await request(app)
      .post('/api/ministry-calendars')
      .set('Authorization', `Bearer ${manageToken}`)
      .send({
        name: 'Public Schedule Calendar',
        ministryId: testMinistryId,
        serviceDayOfWeek: 0,
      })
    testCalendarId = calRes.body.data.id
    shareToken = calRes.body.data.shareToken

    // Member
    const member = await prisma.member.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: `public-schedule-member-${Date.now()}@test.example.com`,
        status: 'active',
      },
    })
    testMemberId = member.id

    // --- Published period with a FUTURE slot that has an assignment ---
    const futurePeriodRes = await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ year: futureDate.getFullYear(), month: futureDate.getMonth() + 1 })
    const futurePeriodId = futurePeriodRes.body.data.id

    const futureSlotRes = await request(app)
      .post('/api/schedule-slots')
      .set('Authorization', `Bearer ${manageToken}`)
      .send({
        periodId: futurePeriodId,
        slotDate: futureDate.toISOString(),
        label: 'Morning Service',
      })
    const futureSlotId = futureSlotRes.body.data.id

    await request(app)
      .post(`/api/schedule-slots/${futureSlotId}/assign`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ memberId: testMemberId })

    // Publish the future period
    await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods/${futurePeriodId}/publish`)
      .set('Authorization', `Bearer ${manageToken}`)

    // --- Published period with a PAST slot that has an assignment ---
    // This tests that past slots are not returned.
    // NOTE: past dates may be in a different month so create appropriate period.
    const pastYear = pastDate.getFullYear()
    const pastMonth = pastDate.getMonth() + 1
    const pastPeriodRes = await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ year: pastYear, month: pastMonth })
    const pastPeriodId = pastPeriodRes.body.data.id

    const pastSlotRes = await request(app)
      .post('/api/schedule-slots')
      .set('Authorization', `Bearer ${manageToken}`)
      .send({
        periodId: pastPeriodId,
        slotDate: pastDate.toISOString(),
        label: 'Past Service',
      })
    const pastSlotId = pastSlotRes.body.data.id

    await request(app)
      .post(`/api/schedule-slots/${pastSlotId}/assign`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ memberId: testMemberId })

    await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods/${pastPeriodId}/publish`)
      .set('Authorization', `Bearer ${manageToken}`)
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Cascade: deleting the calendar removes periods, slots, assignments
    await prisma.ministryCalendar.deleteMany({
      where: { ministryId: testMinistryId },
    })
    await prisma.member.deleteMany({ where: { id: testMemberId } })
    await prisma.ministry.deleteMany({ where: { id: testMinistryId } })
    await prisma.user.deleteMany({
      where: { id: 'public-sched-manage' },
    }).catch(() => {})
    await prisma.$disconnect()
  })

  // ============================================
  // GET /public/schedule/:token
  // ============================================

  describe('GET /public/schedule/:token', () => {
    it.skipIf(!isDbAvailable)('returns 200 with upcoming published slots for a valid token', async () => {
      const res = await request(app).get(`/public/schedule/${shareToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it.skipIf(!isDbAvailable)('returns 404 for an invalid or unknown token', async () => {
      const res = await request(app).get('/public/schedule/deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')

      expect(res.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('anonymizes member name to "First L." format — never exposes full last name', async () => {
      const res = await request(app).get(`/public/schedule/${shareToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThan(0)

      for (const slot of res.body.data) {
        const name: string = slot.assignedMember
        // Must match "Firstname L." pattern
        expect(name).toMatch(/^.+ [A-Z]\.$/)
        // Must NOT contain the full last name "Smith"
        expect(name).not.toContain('Smith')
      }
    })

    it.skipIf(!isDbAvailable)('response does NOT include member id, email, or phone', async () => {
      const res = await request(app).get(`/public/schedule/${shareToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThan(0)

      for (const slot of res.body.data) {
        expect(slot).not.toHaveProperty('id')
        expect(slot).not.toHaveProperty('memberId')
        expect(slot).not.toHaveProperty('email')
        expect(slot).not.toHaveProperty('phone')
        // Should only have slotDate, label, and assignedMember
        expect(slot).toHaveProperty('slotDate')
        expect(slot).toHaveProperty('assignedMember')
      }
    })

    it.skipIf(!isDbAvailable)('only returns slots within the next 30 days — past slots are excluded', async () => {
      const res = await request(app).get(`/public/schedule/${shareToken}`)

      expect(res.status).toBe(200)

      const now = new Date()
      for (const slot of res.body.data) {
        const slotDate = new Date(slot.slotDate)
        // All returned slots must be in the future (>= today)
        expect(slotDate.getTime()).toBeGreaterThanOrEqual(
          new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z').getTime()
        )
      }
    })

    it.skipIf(!isDbAvailable)('only returns slots within the next 30 days — slots beyond 30 days are excluded', async () => {
      // Create a slot dated 35 days from now (outside the 30-day window)
      const beyondDate = new Date(now)
      beyondDate.setDate(beyondDate.getDate() + 35)

      const beyondPeriodRes = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: beyondDate.getFullYear(), month: beyondDate.getMonth() + 1 })
      const beyondPeriodId = beyondPeriodRes.body.data.id

      const beyondSlotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          periodId: beyondPeriodId,
          slotDate: beyondDate.toISOString(),
          label: 'Far Future Service',
        })
      const beyondSlotId = beyondSlotRes.body.data.id

      await request(app)
        .post(`/api/schedule-slots/${beyondSlotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${beyondPeriodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      const res = await request(app).get(`/public/schedule/${shareToken}`)

      expect(res.status).toBe(200)

      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() + 30)

      const beyondDateStr = beyondDate.toISOString().split('T')[0]
      const returnedDates = res.body.data.map((slot: { slotDate: string }) =>
        new Date(slot.slotDate).toISOString().split('T')[0]
      )

      // The 35-day-out slot must NOT appear in the response
      expect(returnedDates).not.toContain(beyondDateStr)

      // All returned slots must be on or before the 30-day cutoff
      for (const slot of res.body.data) {
        const slotDate = new Date(slot.slotDate)
        expect(slotDate.getTime()).toBeLessThanOrEqual(cutoff.getTime())
      }
    })

    it.skipIf(!isDbAvailable)('does not require any authentication header', async () => {
      // Request with no Authorization header should still succeed
      const res = await request(app)
        .get(`/public/schedule/${shareToken}`)
        // No .set('Authorization', ...) call

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it.skipIf(!isDbAvailable)('returns 404 for an inactive (soft-deleted) calendar', async () => {
      // Create a temporary calendar, capture its token, then deactivate it
      const tempCalRes = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          name: 'Temp Inactive Calendar',
          ministryId: testMinistryId,
          serviceDayOfWeek: 0,
        })
      const tempCalId = tempCalRes.body.data.id
      const tempToken = tempCalRes.body.data.shareToken

      // Soft-delete it
      await request(app)
        .delete(`/api/ministry-calendars/${tempCalId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      const res = await request(app).get(`/public/schedule/${tempToken}`)
      expect(res.status).toBe(404)
    })
  })
})
