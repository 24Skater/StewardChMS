import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const isDbAvailable = !!process.env.DATABASE_URL

describe('Events API', () => {
  let authToken: string
  let testUserId: string

  beforeAll(async () => {
    if (!isDbAvailable) return

    // Create test user with events permissions
    const passwordHash = await bcrypt.hash('testpass123', 12)
    const testUser = await prisma.user.create({
      data: {
        email: 'events-test@test.com',
        name: 'Events Test User',
        passwordHash,
        isActive: true,
      },
    })
    testUserId = testUser.id

    // Create role with permissions
    const role = await prisma.role.create({
      data: { name: 'events-test-role' },
    })

    // Create permissions
    const permissions = ['events.read', 'events.write', 'worship.read', 'worship.write']
    for (const key of permissions) {
      const perm = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      })
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      })
    }

    await prisma.userRole.create({
      data: { userId: testUser.id, roleId: role.id },
    })

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Cleanup
    await prisma.eventOccurrence.deleteMany({ where: { event: { title: { contains: 'Test Event' } } } })
    await prisma.event.deleteMany({ where: { title: { contains: 'Test Event' } } })
    await prisma.userRole.deleteMany({ where: { userId: testUserId } })
    await prisma.rolePermission.deleteMany({ where: { role: { name: 'events-test-role' } } })
    await prisma.role.deleteMany({ where: { name: 'events-test-role' } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('POST /api/events', () => {
    it.skipIf(!isDbAvailable)('creates an event with valid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event - Sunday Service',
          description: 'Weekly worship service',
          location: 'Main Sanctuary',
          category: 'Church-wide',
          isRecurring: false,
          startDatetime: new Date(Date.now() + 86400000).toISOString(),
        })

      expect(response.status).toBe(201)
      expect(response.body.title).toBe('Test Event - Sunday Service')
      expect(response.body.id).toBeDefined()
    })

    it.skipIf(!isDbAvailable)('creates a recurring event', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event - Weekly Bible Study',
          description: 'Wednesday night study',
          isRecurring: true,
          recurrenceRule: JSON.stringify({ frequency: 'weekly', dayOfWeek: 3 }),
          startDatetime: new Date().toISOString(),
        })

      expect(response.status).toBe(201)
      expect(response.body.isRecurring).toBe(true)
      expect(response.body.recurrenceRule).toBeDefined()
    })

    it.skipIf(!isDbAvailable)('rejects invalid recurrence rule', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Event - Invalid',
          isRecurring: true,
          recurrenceRule: 'invalid-json',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid recurrence rule format')
    })
  })

  describe('GET /api/events', () => {
    it.skipIf(!isDbAvailable)('lists events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.events).toBeDefined()
      expect(Array.isArray(response.body.events)).toBe(true)
    })

    it.skipIf(!isDbAvailable)('filters events by category', async () => {
      const response = await request(app)
        .get('/api/events?category=Church-wide')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.events).toBeDefined()
    })
  })

  describe('Generate Occurrences', () => {
    let recurringEventId: string

    beforeEach(async () => {
      if (!isDbAvailable) return

      // Create a recurring event for testing
      const event = await prisma.event.create({
        data: {
          title: 'Test Event - Recurring for Generation',
          isRecurring: true,
          recurrenceRule: JSON.stringify({ frequency: 'weekly', dayOfWeek: 0 }), // Every Sunday
          startDatetime: new Date(),
        },
      })
      recurringEventId = event.id
    })

    it.skipIf(!isDbAvailable)('generates weekly occurrences correctly', async () => {
      const response = await request(app)
        .post(`/api/events/${recurringEventId}/generate-occurrences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: 90 })

      expect(response.status).toBe(200)
      expect(response.body.created).toBeGreaterThanOrEqual(12) // ~13 weeks in 90 days
      expect(response.body.created).toBeLessThanOrEqual(14)
    })

    it.skipIf(!isDbAvailable)('prevents duplicate occurrences', async () => {
      // Generate first batch
      await request(app)
        .post(`/api/events/${recurringEventId}/generate-occurrences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: 30 })

      // Try to generate again
      const response = await request(app)
        .post(`/api/events/${recurringEventId}/generate-occurrences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: 30 })

      expect(response.status).toBe(200)
      // Should skip all since they already exist
      expect(response.body.skipped).toBeGreaterThan(0)
    })
  })

  describe('Monthly Recurrence', () => {
    it.skipIf(!isDbAvailable)('generates monthly occurrences correctly', async () => {
      // Create event for 1st Monday of each month
      const event = await prisma.event.create({
        data: {
          title: 'Test Event - Monthly Board Meeting',
          isRecurring: true,
          recurrenceRule: JSON.stringify({ frequency: 'monthly', dayOfWeek: 1, weekOfMonth: 1 }),
          startDatetime: new Date(),
        },
      })

      const response = await request(app)
        .post(`/api/events/${event.id}/generate-occurrences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ daysAhead: 90 })

      expect(response.status).toBe(200)
      expect(response.body.created).toBeGreaterThanOrEqual(2) // ~3 months in 90 days
      expect(response.body.created).toBeLessThanOrEqual(4)
    })
  })
})

