import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { signToken } from '../lib/auth.js'

const DATABASE_URL = process.env.DATABASE_URL
let prisma: PrismaClient | null = null
if (DATABASE_URL) {
  prisma = new PrismaClient()
}

const describeWithDb = DATABASE_URL ? describe : describe.skip

describeWithDb('Schedule Slots API', () => {
  let testMinistryId: string
  let testCalendarId: string
  let testPeriodId: string
  let testMemberId: string
  let testSlotId: string
  let manageToken: string

  beforeAll(async () => {
    if (!prisma) return
    const user = await prisma.user.findFirst({ where: { isActive: true } })
    if (!user) return

    manageToken = signToken({
      userId: user.id,
      email: user.email,
      roles: ['admin'],
      permissions: ['schedules.view', 'schedules.manage'],
    }).accessToken

    const ministry = await prisma.ministry.create({
      data: { name: `Test Ministry Slots ${Date.now()}`, isActive: true },
    })
    testMinistryId = ministry.id

    const calendar = await prisma.ministryCalendar.create({
      data: {
        name: 'Test Calendar Slots',
        ministryId: testMinistryId,
        shareToken: `slot-token-${Date.now()}`,
        createdById: user.id,
      },
    })
    testCalendarId = calendar.id

    const period = await prisma.schedulePeriod.create({
      data: { calendarId: testCalendarId, year: 2026, month: 8 },
    })
    testPeriodId = period.id

    const member = await prisma.member.create({
      data: { firstName: 'Test', lastName: 'Scheduler', status: 'active' },
    })
    testMemberId = member.id
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.slotAssignment.deleteMany({ where: { slot: { period: { calendarId: testCalendarId } } } })
    await prisma.scheduleSlot.deleteMany({ where: { period: { calendarId: testCalendarId } } })
    await prisma.schedulePeriod.deleteMany({ where: { calendarId: testCalendarId } })
    await prisma.ministryCalendar.deleteMany({ where: { ministryId: testMinistryId } })
    await prisma.ministry.delete({ where: { id: testMinistryId } }).catch(() => {})
    await prisma.member.delete({ where: { id: testMemberId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('POST /api/schedule-slots', () => {
    it('creates a slot in a draft period', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ periodId: testPeriodId, slotDate: '2026-08-02T00:00:00.000Z', label: 'Head Usher' })

      expect(res.status).toBe(201)
      expect(res.body.label).toBe('Head Usher')
      testSlotId = res.body.id
    })

    it('returns 400 for missing periodId', async () => {
      const res = await request(app)
        .post('/api/schedule-slots')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ slotDate: '2026-08-02T00:00:00.000Z' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/schedule-slots/:id/assign', () => {
    it('assigns a member and returns conflict info', async () => {
      const res = await request(app)
        .post(`/api/schedule-slots/${testSlotId}/assign`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ memberId: testMemberId })

      expect(res.status).toBe(201)
      expect(res.body.assignment).toBeDefined()
      expect(res.body.assignment.memberId).toBe(testMemberId)
      expect(Array.isArray(res.body.conflicts)).toBe(true)
    })
  })

  describe('PUT /api/schedule-slots/:id', () => {
    it('updates slot label', async () => {
      const res = await request(app)
        .put(`/api/schedule-slots/${testSlotId}`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ label: 'Door Usher' })
      expect(res.status).toBe(200)
      expect(res.body.label).toBe('Door Usher')
    })
  })

  describe('DELETE /api/schedule-slots/:id/assignment', () => {
    it('unassigns a member', async () => {
      const res = await request(app)
        .delete(`/api/schedule-slots/${testSlotId}/assignment`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(204)
    })
  })

  describe('DELETE /api/schedule-slots/:id', () => {
    it('deletes a slot from a draft period', async () => {
      const res = await request(app)
        .delete(`/api/schedule-slots/${testSlotId}`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(204)
    })
  })
})
