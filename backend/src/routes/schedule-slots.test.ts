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
  userId: 'sched-slots-manage',
  email: 'sched-slots-manage@test.example.com',
  roles: ['schedules-manager'],
  permissions: ['schedules.view', 'schedules.manage'],
}).accessToken

const viewOnlyToken = signToken({
  userId: 'sched-slots-view',
  email: 'sched-slots-view@test.example.com',
  roles: ['schedules-viewer'],
  permissions: ['schedules.view'],
}).accessToken

// ============================================
// Test state — cleaned up in afterAll
// ============================================

let testMinistryId: string
let testCalendarId: string
let testCalendar2Id: string
let draftPeriodId: string
let publishedPeriodId: string
let testMemberId: string

// ============================================
// Tests
// ============================================

describe('Schedule Slots API', () => {
  beforeAll(async () => {
    if (!isDbAvailable) return

    // Ministry
    const ministry = await prisma.ministry.create({
      data: { name: `Slots Test Ministry ${Date.now()}` },
    })
    testMinistryId = ministry.id

    // Calendar 1
    const cal1Res = await request(app)
      .post('/api/ministry-calendars')
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ name: 'Slots Cal 1', ministryId: testMinistryId, serviceDayOfWeek: 0 })
    testCalendarId = cal1Res.body.data.id

    // Calendar 2 (for conflict detection)
    const cal2Res = await request(app)
      .post('/api/ministry-calendars')
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ name: 'Slots Cal 2', ministryId: testMinistryId, serviceDayOfWeek: 0 })
    testCalendar2Id = cal2Res.body.data.id

    // Draft period for calendar 1
    const draftRes = await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ year: 2060, month: 1 })
    draftPeriodId = draftRes.body.data.id

    // Another draft period — we'll publish it for published-period tests
    const toPublishRes = await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods`)
      .set('Authorization', `Bearer ${manageToken}`)
      .send({ year: 2060, month: 2 })
    publishedPeriodId = toPublishRes.body.data.id

    await request(app)
      .post(`/api/ministry-calendars/${testCalendarId}/periods/${publishedPeriodId}/publish`)
      .set('Authorization', `Bearer ${manageToken}`)

    // Test member
    const member = await prisma.member.create({
      data: {
        firstName: 'Slot',
        lastName: 'Tester',
        email: `slot-tester-${Date.now()}@test.example.com`,
        status: 'active',
      },
    })
    testMemberId = member.id
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Cascade: deleting calendars removes periods, slots, assignments
    await prisma.ministryCalendar.deleteMany({
      where: { ministryId: testMinistryId },
    })
    await prisma.member.deleteMany({ where: { id: testMemberId } })
    await prisma.ministry.deleteMany({ where: { id: testMinistryId } })
    await prisma.$disconnect()
  })

  // ============================================
  // POST /api/schedule-slots
  // ============================================

  describe('POST /api/schedule-slots', () => {
    it.skipIf(!isDbAvailable)('adds a slot to a draft period and returns 201', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          periodId: draftPeriodId,
          slotDate: '2060-01-07T10:00:00.000Z',
          label: 'Morning Service',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.periodId).toBe(draftPeriodId)
      expect(res.body.data.label).toBe('Morning Service')
    })

    it.skipIf(!isDbAvailable)('returns 409 when adding a slot to a published period', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({
          periodId: publishedPeriodId,
          slotDate: '2060-02-07T10:00:00.000Z',
        })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('Cannot add slots to a published period')
    })

    it.skipIf(!isDbAvailable)('returns 400 for missing periodId', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ slotDate: '2060-01-14T10:00:00.000Z' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-21T10:00:00.000Z' })

      expect(res.status).toBe(403)
    })

    it.skipIf(!isDbAvailable)('returns 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .send({ periodId: draftPeriodId, slotDate: '2060-01-28T10:00:00.000Z' })

      expect(res.status).toBe(401)
    })
  })

  // ============================================
  // POST /api/schedule-slots/:id/assign
  // ============================================

  describe('POST /api/schedule-slots/:id/assign', () => {
    it.skipIf(!isDbAvailable)('assigns a member to a slot — response contains { assignment, conflicts: [] }', async () => {
      // Create a slot
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-12T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      const res = await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.assignment).toBeDefined()
      expect(res.body.data.assignment.memberId).toBe(testMemberId)
      expect(Array.isArray(res.body.data.conflicts)).toBe(true)
      expect(res.body.data.conflicts).toHaveLength(0)
    })

    it.skipIf(!isDbAvailable)('returns conflicts when the same member is assigned to two different calendars on the same date', async () => {
      // Create a draft period on calendar 2
      const period2Res = await request(app)
        .post(`/api/ministry-calendars/${testCalendar2Id}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2060, month: 3 })
      const period2Id = period2Res.body.data.id

      const conflictDate = '2060-03-08T10:00:00.000Z'

      // Slot on calendar 1
      // We need slots in DIFFERENT calendars on the same date.
      // Create another draft period for cal1 in month 3 to have a slot on the conflict date:
      const period1Month3Res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2060, month: 3 })
      const period1Month3Id = period1Month3Res.body.data.id

      const slot1Cal1Res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: period1Month3Id, slotDate: conflictDate })
      const slot1CalId = slot1Cal1Res.body.data.id

      const slot2Cal2Res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: period2Id, slotDate: conflictDate })
      const slot2CalId = slot2Cal2Res.body.data.id

      // Create a second test member for conflict test
      const secondMember = await prisma.member.create({
        data: {
          firstName: 'Conflict',
          lastName: 'Checker',
          email: `conflict-checker-${Date.now()}@test.example.com`,
          status: 'active',
        },
      })

      // Assign second member to slot in calendar 1
      await request(app)
        .post(`/api/schedule-slots/${slot1CalId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: secondMember.id })

      // Assign same member to slot in calendar 2 on the same date → should have 1 conflict
      const conflictRes = await request(app)
        .post(`/api/schedule-slots/${slot2CalId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: secondMember.id })

      expect(conflictRes.status).toBe(201)
      expect(conflictRes.body.data.conflicts).toHaveLength(1)
      expect(conflictRes.body.data.conflicts[0].calendarId).toBe(testCalendarId)

      // Cleanup member
      await prisma.member.delete({ where: { id: secondMember.id } })
    })

    it.skipIf(!isDbAvailable)('returns 409 when assigning to an already-assigned slot', async () => {
      // Create a fresh slot and assign once
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-19T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      // Second assignment should conflict
      const secondRes = await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      expect(secondRes.status).toBe(409)
      expect(secondRes.body.error).toContain('already has an assignment')
    })

    it.skipIf(!isDbAvailable)('returns 400 for missing memberId', async () => {
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-26T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      const res = await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })

    it.skipIf(!isDbAvailable)('returns 404 for a non-existent slot', async () => {
      const res = await request(app)
        .post('/api/schedule-slots/nonexistentslotid/assign')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      expect(res.status).toBe(404)
    })
  })

  // ============================================
  // DELETE /api/schedule-slots/:id/assignment
  // ============================================

  describe('DELETE /api/schedule-slots/:id/assignment', () => {
    it.skipIf(!isDbAvailable)('removes an assignment from a slot', async () => {
      // Create slot and assign a member
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-05T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      await request(app)
        .post(`/api/schedule-slots/${slotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      const res = await request(app)
        .delete(`/api/schedule-slots/${slotId}/assignment`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('removed')
    })

    it.skipIf(!isDbAvailable)('returns 404 when the slot has no assignment', async () => {
      // Create an unassigned slot
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-06T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      const res = await request(app)
        .delete(`/api/schedule-slots/${slotId}/assignment`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toContain('No assignment found')
    })

    it.skipIf(!isDbAvailable)('returns 404 for a non-existent slot', async () => {
      const res = await request(app)
        .delete('/api/schedule-slots/nonexistentslotid/assignment')
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(404)
    })

    it.skipIf(!isDbAvailable)('returns 403 for view-only user', async () => {
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-08T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      const res = await request(app)
        .delete(`/api/schedule-slots/${slotId}/assignment`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(403)
    })
  })

  // ============================================
  // DELETE /api/schedule-slots/:id
  // ============================================

  describe('DELETE /api/schedule-slots/:id', () => {
    it.skipIf(!isDbAvailable)('deletes a slot from a draft period', async () => {
      const slotRes = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: draftPeriodId, slotDate: '2060-01-09T10:00:00.000Z' })
      const slotId = slotRes.body.data.id

      const res = await request(app)
        .delete(`/api/schedule-slots/${slotId}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const record = await prisma.scheduleSlot.findUnique({ where: { id: slotId } })
      expect(record).toBeNull()
    })

    it.skipIf(!isDbAvailable)('returns 409 when deleting a slot from a published period', async () => {
      // Add a slot to the published period through the DB directly (since the API blocks it)
      const slot = await prisma.scheduleSlot.create({
        data: { periodId: publishedPeriodId, slotDate: new Date('2060-02-02T10:00:00.000Z') },
      })

      const res = await request(app)
        .delete(`/api/schedule-slots/${slot.id}`)
        .set('Authorization', `Bearer ${manageToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('Cannot delete slots from a published period')

      // Cleanup the directly-inserted slot
      await prisma.scheduleSlot.deleteMany({ where: { id: slot.id } })
    })
  })
})
