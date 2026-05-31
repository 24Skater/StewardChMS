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
// Tokens
// ============================================

const manageToken = signToken({
  userId: 'sched-periods-manage',
  email: 'sched-periods-manage@test.example.com',
  roles: ['schedules-manager'],
  permissions: ['schedules.view', 'schedules.manage'],
}).accessToken

const viewOnlyToken = signToken({
  userId: 'sched-periods-view',
  email: 'sched-periods-view@test.example.com',
  roles: ['schedules-viewer'],
  permissions: ['schedules.view'],
}).accessToken

// ============================================
// Test state
// ============================================

let testMinistryId: string
let testCalendarId: string
let createdPeriodIds: string[] = []

// ============================================
// Helpers
// ============================================

async function createCalendar(ministryId: string, serviceDayOfWeek = 0): Promise<string> {
  const res = await request(app)
    .post('/api/ministry-calendars')
    .set('Authorization', `Bearer ${manageToken}`)
    .send({
      name: `Test Calendar ${Date.now()}`,
      ministryId,
      serviceDayOfWeek,
    })
  return res.body.data.id
}

async function createDraftPeriod(
  calendarId: string,
  year: number,
  month: number,
  autoGenerate = false,
) {
  const res = await request(app)
    .post(`/api/ministry-calendars/${calendarId}/periods`)
    .set('Authorization', `Bearer ${manageToken}`)
    .send({ year, month, autoGenerate })

  if (res.status === 201) {
    createdPeriodIds.push(res.body.data.id)
  }
  return res
}

// ============================================
// Tests
// ============================================

describe('Schedule Periods API', () => {
  beforeAll(async () => {
    if (!isDbAvailable) return
    await prisma.user.upsert({
      where: { email: 'sched-periods-manage@test.example.com' },
      update: {},
      create: { id: 'sched-periods-manage', email: 'sched-periods-manage@test.example.com', passwordHash: 'test-hash', isActive: true },
    })
    await prisma.user.upsert({
      where: { email: 'sched-periods-view@test.example.com' },
      update: {},
      create: { id: 'sched-periods-view', email: 'sched-periods-view@test.example.com', passwordHash: 'test-hash', isActive: true },
    })
    const ministry = await prisma.ministry.create({
      data: { name: `Period Test Ministry ${Date.now()}` },
    })
    testMinistryId = ministry.id
    testCalendarId = await createCalendar(testMinistryId, 0) // Sunday calendar
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Cascade deletes: deleting the calendar removes periods, slots, and assignments
    await prisma.ministryCalendar.deleteMany({
      where: { ministryId: testMinistryId },
    })
    await prisma.ministry.deleteMany({ where: { id: testMinistryId } })
    await prisma.user.deleteMany({
      where: { id: { in: ['sched-periods-manage', 'sched-periods-view'] } },
    }).catch(() => {})
    await prisma.$disconnect()
  })

  // ============================================
  // POST /api/ministry-calendars/:calendarId/periods
  // ============================================

  describe('POST /api/ministry-calendars/:calendarId/periods', () => {
    it.skipIf(!isDbAvailable)('creates a draft period', async () => {
      const res = await createDraftPeriod(testCalendarId, 2030, 1)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('draft')
      expect(res.body.data.year).toBe(2030)
      expect(res.body.data.month).toBe(1)
      expect(res.body.data.id).toBeDefined()
    })

    it.skipIf(!isDbAvailable)('returns 409 when period for same calendar+month already exists', async () => {
      // Create period for a unique year+month combination
      await createDraftPeriod(testCalendarId, 2031, 3)

      const secondRes = await createDraftPeriod(testCalendarId, 2031, 3)
      expect(secondRes.status).toBe(409)
      expect(secondRes.body.error).toContain('already exists')
    })

    it.skipIf(!isDbAvailable)('creates slots for matching service day of week when autoGenerate is true', async () => {
      // Calendar is serviceDayOfWeek = 0 (Sunday)
      // January 2030 Sundays: 6, 13, 20, 27 → 4 Sundays
      const res = await createDraftPeriod(testCalendarId, 2030, 2, true)

      expect(res.status).toBe(201)
      expect(res.body.data.slotCount).toBeGreaterThan(0)
      // Verify slots were created in DB
      const slots = await prisma.scheduleSlot.findMany({
        where: { periodId: res.body.data.id },
      })
      expect(slots.length).toBe(res.body.data.slotCount)
    })

    it.skipIf(!isDbAvailable)('returns 400 for invalid month value', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2030, month: 13 }) // invalid month

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it.skipIf(!isDbAvailable)('returns 404 for non-existent calendar', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars/nonexistentcalid/periods')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2030, month: 5 })

      expect(res.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({ year: 2032, month: 1 })

      expect(res.status).toBe(403)
    })
  })

  // ============================================
  // GET /api/ministry-calendars/:calendarId/periods
  // ============================================

  describe('GET /api/ministry-calendars/:calendarId/periods', () => {
    it.skipIf(!isDbAvailable)('lists periods for a calendar', async () => {
      const res = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it.skipIf(!isDbAvailable)('returns 401 without auth token', async () => {
      const res = await request(app).get(
        `/api/ministry-calendars/${testCalendarId}/periods`,
      )
      expect(res.status).toBe(401)
    })
  })

  // ============================================
  // POST /api/ministry-calendars/:calendarId/periods/:id/publish
  // ============================================

  describe('POST publish', () => {
    it.skipIf(!isDbAvailable)('transitions status from draft to published', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2040, 1)
      const periodId = createRes.body.data.id

      const pubRes = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(pubRes.status).toBe(200)
      expect(pubRes.body.data.status).toBe('published')
    })

    it.skipIf(!isDbAvailable)('stamps notifiedAt on existing assignments when publishing', async () => {
      // Create a separate calendar and period for this test
      const calId = await createCalendar(testMinistryId, 0)
      const createRes = await request(app)
        .post(`/api/ministry-calendars/${calId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2041, month: 1, autoGenerate: false })
      const periodId = createRes.body.data.id
      createdPeriodIds.push(periodId)

      // Add a slot to the period
      const member = await prisma.member.create({
        data: {
          firstName: 'Notify',
          lastName: 'Test',
          email: `notify-test-${Date.now()}@test.example.com`,
          status: 'active',
        },
      })

      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          periodId,
          slotDate: '2041-01-05T10:00:00.000Z',
        })
      const slotId = slotRes.body.data.id

      // Assign the member to the slot
      await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: member.id })

      // Publish the period
      const pubRes = await request(app)
        .post(`/api/ministry-calendars/${calId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(pubRes.status).toBe(200)

      // Verify the assignment now has notifiedAt stamped
      const assignment = await prisma.slotAssignment.findFirst({
        where: { slot: { periodId } },
      })
      expect(assignment?.notifiedAt).not.toBeNull()

      // Cleanup member
      await prisma.member.delete({ where: { id: member.id } })
    })

    it.skipIf(!isDbAvailable)('returns 409 when trying to publish an already-published period', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2040, 2)
      const periodId = createRes.body.data.id

      await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      const secondPubRes = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(secondPubRes.status).toBe(409)
      expect(secondPubRes.body.error).toContain('already published')
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2040, 3)
      const periodId = createRes.body.data.id

      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(403)
    })
  })

  // ============================================
  // DELETE /api/ministry-calendars/:calendarId/periods/:id
  // ============================================

  describe('DELETE period', () => {
    it.skipIf(!isDbAvailable)('deletes a draft period successfully', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2050, 1)
      const periodId = createRes.body.data.id
      // Remove from createdPeriodIds since we delete it here
      createdPeriodIds = createdPeriodIds.filter(id => id !== periodId)

      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('deleted')

      // Verify it's gone from the DB
      const record = await prisma.schedulePeriod.findUnique({ where: { id: periodId } })
      expect(record).toBeNull()
    })

    it.skipIf(!isDbAvailable)('returns 409 when attempting to delete a published period', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2050, 2)
      const periodId = createRes.body.data.id

      // Publish it first
      await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)

      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('Cannot delete published period')
    })

    it.skipIf(!isDbAvailable)('returns 404 for a non-existent period', async () => {
      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/nonexistentperiod`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const createRes = await createDraftPeriod(testCalendarId, 2050, 3)
      const periodId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/${periodId}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(403)
    })
  })
})
