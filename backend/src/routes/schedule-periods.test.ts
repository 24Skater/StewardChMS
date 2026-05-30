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

describeWithDb('Schedule Periods API', () => {
  let testMinistryId: string
  let testCalendarId: string
  let testPeriodId: string
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
      data: { name: `Test Ministry Periods ${Date.now()}`, isActive: true },
    })
    testMinistryId = ministry.id

    const calendar = await prisma.ministryCalendar.create({
      data: {
        name: 'Test Calendar',
        ministryId: testMinistryId,
        shareToken: `test-token-${Date.now()}`,
        createdById: user.id,
        serviceDayOfWeek: 0,
      },
    })
    testCalendarId = calendar.id
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.schedulePeriod.deleteMany({ where: { calendarId: testCalendarId } })
    await prisma.ministryCalendar.deleteMany({ where: { ministryId: testMinistryId } })
    await prisma.ministry.delete({ where: { id: testMinistryId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('POST /api/ministry-calendars/:calendarId/periods', () => {
    it('creates a draft period', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2026, month: 6, autoGenerate: false })

      expect(res.status).toBe(201)
      expect(res.body.status).toBe('DRAFT')
      expect(res.body.year).toBe(2026)
      expect(res.body.month).toBe(6)
      testPeriodId = res.body.id
    })

    it('returns 409 for duplicate month', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2026, month: 6, autoGenerate: false })
      expect(res.status).toBe(409)
    })

    it('returns 400 for invalid month', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2026, month: 13 })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/ministry-calendars/:calendarId/periods', () => {
    it('lists periods for a calendar', async () => {
      const res = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/ministry-calendars/:calendarId/periods/:id', () => {
    it('returns period with slots', async () => {
      const res = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}/periods/${testPeriodId}`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(testPeriodId)
      expect(Array.isArray(res.body.slots)).toBe(true)
    })
  })

  describe('POST /api/ministry-calendars/:calendarId/periods/:id/publish', () => {
    it('publishes a draft period', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${testPeriodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('PUBLISHED')
    })

    it('returns 409 for already published period', async () => {
      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods/${testPeriodId}/publish`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/ministry-calendars/:calendarId/periods/:id', () => {
    it('returns 409 when deleting published period', async () => {
      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/${testPeriodId}`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(409)
    })

    it('deletes a draft period', async () => {
      const created = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/periods`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ year: 2026, month: 7, autoGenerate: false })
      expect(created.status).toBe(201)

      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}/periods/${created.body.id}`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(204)
    })
  })
})
