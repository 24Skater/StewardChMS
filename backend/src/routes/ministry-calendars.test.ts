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

describeWithDb('Ministry Calendars API', () => {
  let testMinistryId: string
  let testCalendarId: string
  let manageToken: string
  let viewToken: string
  let noToken: string

  beforeAll(async () => {
    if (!prisma) return

    manageToken = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['admin'],
      permissions: ['schedules.view', 'schedules.manage'],
    }).accessToken

    viewToken = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['scheduler'],
      permissions: ['schedules.view'],
    }).accessToken

    noToken = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['staff'],
      permissions: ['members.read'],
    }).accessToken

    // Create a test ministry
    const ministry = await prisma.ministry.create({
      data: { name: `Test Ministry ${Date.now()}`, isActive: true },
    })
    testMinistryId = ministry.id
  })

  afterAll(async () => {
    if (!prisma) return
    await prisma.ministryCalendar.deleteMany({ where: { ministryId: testMinistryId } })
    await prisma.ministry.delete({ where: { id: testMinistryId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('POST /api/ministry-calendars', () => {
    it('creates a calendar with valid data', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ name: 'Ushers Schedule', ministryId: testMinistryId, serviceDayOfWeek: 0 })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Ushers Schedule')
      expect(res.body.id).toBeDefined()
      testCalendarId = res.body.id
    })

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ ministryId: testMinistryId })
      expect(res.status).toBe(400)
    })

    it('returns 403 without schedules.manage permission', async () => {
      const res = await request(app)
        .post('/api/ministry-calendars')
        .set('Authorization', `Bearer ${noToken}`)
        .send({ name: 'Blocked', ministryId: testMinistryId })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/ministry-calendars', () => {
    it('lists active calendars', async () => {
      const res = await request(app)
        .get('/api/ministry-calendars')
        .set('Authorization', `Bearer ${viewToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns 403 without schedules.view permission', async () => {
      const res = await request(app)
        .get('/api/ministry-calendars')
        .set('Authorization', `Bearer ${noToken}`)
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/ministry-calendars/:id', () => {
    it('returns calendar details', async () => {
      const res = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}`)
        .set('Authorization', `Bearer ${viewToken}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(testCalendarId)
      expect(res.body.rotationMembers).toBeDefined()
    })

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .get('/api/ministry-calendars/nonexistent')
        .set('Authorization', `Bearer ${viewToken}`)
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/ministry-calendars/:id', () => {
    it('updates calendar name', async () => {
      const res = await request(app)
        .put(`/api/ministry-calendars/${testCalendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)
        .send({ name: 'Updated Ushers' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Ushers')
    })
  })

  describe('POST /api/ministry-calendars/:id/token/regenerate', () => {
    it('regenerates share token', async () => {
      const before = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)
      const oldToken = before.body.shareToken

      const res = await request(app)
        .post(`/api/ministry-calendars/${testCalendarId}/token/regenerate`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(200)
      expect(res.body.shareToken).toBeDefined()
      expect(res.body.shareToken).not.toBe(oldToken)
    })
  })

  describe('DELETE /api/ministry-calendars/:id', () => {
    it('soft-deletes calendar', async () => {
      const res = await request(app)
        .delete(`/api/ministry-calendars/${testCalendarId}`)
        .set('Authorization', `Bearer ${manageToken}`)
      expect(res.status).toBe(204)

      const check = await request(app)
        .get(`/api/ministry-calendars/${testCalendarId}`)
        .set('Authorization', `Bearer ${viewToken}`)
      expect(check.status).toBe(404)
    })
  })
})
