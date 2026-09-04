import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
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
  orgId: TEST_ORG_ID,
  userId: 'sched-manage-user',
  email: 'sched-manage@test.example.com',
  roles: ['schedules-manager'],
  permissions: ['schedules.view', 'schedules.manage'],
}).accessToken

const viewOnlyToken = signToken({
  orgId: TEST_ORG_ID,
  userId: 'sched-view-user',
  email: 'sched-view@test.example.com',
  roles: ['schedules-viewer'],
  permissions: ['schedules.view'],
}).accessToken

// ============================================
// Test state
// ============================================

let testMinistryId: string
const createdCalendarIds: string[] = []

// ============================================
// Helpers
// ============================================

async function createTestMinistry(): Promise<string> {
  const ministry = await prisma.ministry.create({
    data: { orgId: TEST_ORG_ID, name: `Test Ministry ${Date.now()}` },
  })
  return ministry.id
}

async function createTestCalendar(ministryId: string, name: string) {
  const res = await request(app)
    .post('/api/ministry-calendars')
    .set('Authorization', `Bearer ${manageToken}`)
    .send({
      name,
      ministryId,
      serviceDayOfWeek: 0, // Sunday
    })
  if (res.status === 201) {
    createdCalendarIds.push(res.body.data.id)
  }
  return res
}

// ============================================
// Tests
// ============================================

describe('Ministry Calendars API', () => {
  beforeAll(async () => {
    if (!isDbAvailable) return
    // Create real users so createdById FK constraints pass
    await prisma.user.upsert({
      where: { email: 'sched-manage@test.example.com' },
      update: {},
      create: { id: 'sched-manage-user', email: 'sched-manage@test.example.com', passwordHash: 'test-hash', isActive: true },
    })
    await prisma.user.upsert({
      where: { email: 'sched-view@test.example.com' },
      update: {},
      create: { id: 'sched-view-user', email: 'sched-view@test.example.com', passwordHash: 'test-hash', isActive: true },
    })
    testMinistryId = await createTestMinistry()
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Clean up calendars (soft-deleted ones already have isActive = false, just delete all)
    if (createdCalendarIds.length > 0) {
      await prisma.ministryCalendar.deleteMany({
        where: { id: { in: createdCalendarIds } },
      })
    }

    await prisma.ministry.deleteMany({
      where: { id: testMinistryId },
    })
    await prisma.user.deleteMany({
      where: { id: { in: ['sched-manage-user', 'sched-view-user'] } },
    }).catch(() => {})

    await prisma.$disconnect()
  })

  // ============================================
  // POST /api/ministry-calendars
  // ============================================

  describe('POST /api/ministry-calendars', () => {
    it.skipIf(!isDbAvailable)('creates a calendar and returns 201 with a 64-char hex shareToken', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          name: 'Sunday Worship Team',
          ministryId: testMinistryId,
          serviceDayOfWeek: 0,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Sunday Worship Team')
      expect(res.body.data.isActive).toBe(true)

      // Token must be a 64-character hex string (32 random bytes → hex)
      expect(typeof res.body.data.shareToken).toBe('string')
      expect(res.body.data.shareToken).toMatch(/^[0-9a-f]{64}$/)

      createdCalendarIds.push(res.body.data.id)
    })

    it.skipIf(!isDbAvailable)('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ name: 'No Ministry ID' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it.skipIf(!isDbAvailable)('returns 403 when user only has schedules.view permission', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({
          name: 'Denied Calendar',
          ministryId: testMinistryId,
        })

      expect(res.status).toBe(403)
    })

    it.skipIf(!isDbAvailable)('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .send({ name: 'No Auth', ministryId: testMinistryId })

      expect(res.status).toBe(401)
    })
  })

  // ============================================
  // GET /api/ministry-calendars
  // ============================================

  describe('GET /api/ministry-calendars', () => {
    it.skipIf(!isDbAvailable)('returns only active calendars', async () => {
      // Create an active calendar and a soft-deleted one
      const activeRes = await createTestCalendar(testMinistryId, 'Active Calendar for List Test')
      const toDeleteRes = await createTestCalendar(testMinistryId, 'Deleted Calendar for List Test')

      // Soft-delete the second calendar
      await request(app)
        .delete(`/api/ministry-calendars/${toDeleteRes.body.data.id}`)
        .set('Authorization', `Bearer ${manageToken}`)

      const listRes = await request(app)
        .get('/api/ministry-calendars')
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(listRes.status).toBe(200)
      expect(listRes.body.success).toBe(true)
      expect(Array.isArray(listRes.body.data)).toBe(true)

      const ids = listRes.body.data.map((c: { id: string }) => c.id)
      expect(ids).toContain(activeRes.body.data.id)
      expect(ids).not.toContain(toDeleteRes.body.data.id)
    })

    it.skipIf(!isDbAvailable)('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/ministry-calendars')
      expect(res.status).toBe(401)
    })
  })

  // ============================================
  // GET /api/ministry-calendars/:id
  // ============================================

  describe('GET /api/ministry-calendars/:id', () => {
    it.skipIf(!isDbAvailable)('returns a single calendar with rotationMembers', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Single Calendar Fetch Test')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .get(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe(calendarId)
      expect(Array.isArray(res.body.data.rotationMembers)).toBe(true)
    })

    it.skipIf(!isDbAvailable)('returns 404 for a non-existent id', async () => {
      const res = await request(app)
        .get('/api/ministry-calendars/nonexistentid000')
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ============================================
  // PUT /api/ministry-calendars/:id
  // ============================================

  describe('PUT /api/ministry-calendars/:id', () => {
    it.skipIf(!isDbAvailable)('updates calendar fields', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar Before Update')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .put(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ name: 'Calendar After Update', reminderDaysBeforeSlot: 3 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Calendar After Update')
      expect(res.body.data.reminderDaysBeforeSlot).toBe(3)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar For Forbidden Update')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .put(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({ name: 'Denied' })

      expect(res.status).toBe(403)
    })

    it.skipIf(!isDbAvailable)('returns 404 for non-existent calendar', async () => {
      const res = await request(app)
        .put('/api/ministry-calendars/nonexistentid000')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  // ============================================
  // DELETE /api/ministry-calendars/:id (soft-delete)
  // ============================================

  describe('DELETE /api/ministry-calendars/:id', () => {
    it.skipIf(!isDbAvailable)('soft-deletes a calendar (sets isActive = false)', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar To Soft Delete')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify via DB that isActive is now false
      const record = await prisma.ministryCalendar.findUnique({ where: { id: calendarId } })
      expect(record?.isActive).toBe(false)
    })

    it.skipIf(!isDbAvailable)('returns 404 when attempting to delete an already-deleted calendar', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Double-Delete Calendar')
      const calendarId = createRes.body.data.id

      await request(app)
        .delete(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      const secondRes = await request(app)
        .delete(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(secondRes.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar For Forbidden Delete')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/ministry-calendars/${calendarId}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(403)
    })
  })

  // ============================================
  // POST /api/ministry-calendars/:id/token/regenerate
  // ============================================

  describe('POST /api/ministry-calendars/:id/token/regenerate', () => {
    it.skipIf(!isDbAvailable)('returns a new 64-char hex token that differs from the original', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar For Token Regen')
      const calendarId = createRes.body.data.id
      const originalToken = createRes.body.data.shareToken

      const regenRes = await request(app)
        .post(`/api/ministry-calendars/${calendarId}/token/regenerate`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(regenRes.status).toBe(200)
      expect(regenRes.body.success).toBe(true)
      expect(regenRes.body.data.shareToken).toMatch(/^[0-9a-f]{64}$/)
      expect(regenRes.body.data.shareToken).not.toBe(originalToken)
    })

    it.skipIf(!isDbAvailable)('old token no longer resolves the public schedule', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar Old Token Test')
      const calendarId = createRes.body.data.id
      const oldToken = createRes.body.data.shareToken

      await request(app)
        .post(`/api/ministry-calendars/${calendarId}/token/regenerate`)
        .set('Authorization', `Bearer ${manageToken}`)

      // The public schedule endpoint uses shareToken — old token should now 404
      const publicRes = await request(app).get(`/public/schedule/${oldToken}`)
      expect(publicRes.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const createRes = await createTestCalendar(testMinistryId, 'Calendar Token Forbidden')
      const calendarId = createRes.body.data.id

      const res = await request(app)
        .post(`/api/ministry-calendars/${calendarId}/token/regenerate`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(403)
    })
  })
})
