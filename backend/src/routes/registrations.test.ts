import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const isDbAvailable = !!process.env.DATABASE_URL

describe('Registrations and Check-ins API', () => {
  let authToken: string
  let testUserId: string
  let testEventId: string
  let testOccurrenceId: string
  let testMemberId: string

  beforeAll(async () => {
    if (!isDbAvailable) return

    // Create test user
    const passwordHash = await bcrypt.hash('testpass123', 12)
    const testUser = await prisma.user.create({
      data: {
        email: 'registrations-test@test.com',
        name: 'Registrations Test User',
        passwordHash,
        isActive: true,
      },
    })
    testUserId = testUser.id

    // Create role with permissions
    const role = await prisma.role.create({
      data: { name: 'registrations-test-role' },
    })

    const permissions = ['events.read', 'events.write', 'members.read']
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

    // Create test event and occurrence
    const event = await prisma.event.create({
      data: {
        title: 'Test Event for Registration',
        isRecurring: false,
        startDatetime: new Date(Date.now() + 86400000),
      },
    })
    testEventId = event.id

    const occurrence = await prisma.eventOccurrence.create({
      data: {
        eventId: event.id,
        startsAt: new Date(Date.now() + 86400000),
        status: 'scheduled',
      },
    })
    testOccurrenceId = occurrence.id

    // Create test member
    const member = await prisma.member.create({
      data: {
        firstName: 'Test',
        lastName: 'Member',
        email: 'testmember-reg@test.com',
        status: 'active',
      },
    })
    testMemberId = member.id
  })

  afterAll(async () => {
    if (!isDbAvailable) return

    // Cleanup
    await prisma.checkIn.deleteMany({ where: { eventOccurrenceId: testOccurrenceId } })
    await prisma.registration.deleteMany({ where: { eventOccurrenceId: testOccurrenceId } })
    await prisma.eventOccurrence.deleteMany({ where: { eventId: testEventId } })
    await prisma.event.deleteMany({ where: { id: testEventId } })
    await prisma.member.deleteMany({ where: { id: testMemberId } })
    await prisma.userRole.deleteMany({ where: { userId: testUserId } })
    await prisma.rolePermission.deleteMany({ where: { role: { name: 'registrations-test-role' } } })
    await prisma.role.deleteMany({ where: { name: 'registrations-test-role' } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('POST /api/occurrences/:id/registrations', () => {
    it.skipIf(!isDbAvailable)('creates registration for a member', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/registrations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          partySize: 2,
        })

      expect(response.status).toBe(201)
      expect(response.body.memberId).toBe(testMemberId)
      expect(response.body.partySize).toBe(2)
      expect(response.body.status).toBe('registered')
    })

    it.skipIf(!isDbAvailable)('creates registration for a guest', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/registrations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guestName: 'John Guest',
          guestEmail: 'john.guest@example.com',
          guestPhone: '555-1234',
          partySize: 3,
        })

      expect(response.status).toBe(201)
      expect(response.body.guestName).toBe('John Guest')
      expect(response.body.guestEmail).toBe('john.guest@example.com')
      expect(response.body.partySize).toBe(3)
      expect(response.body.memberId).toBeNull()
    })

    it.skipIf(!isDbAvailable)('rejects registration without member or guest info', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/registrations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          partySize: 1,
        })

      expect(response.status).toBe(400)
    })

    it.skipIf(!isDbAvailable)('rejects registration for non-existent occurrence', async () => {
      const response = await request(app)
        .post('/api/occurrences/nonexistent-id/registrations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guestName: 'Test Guest',
        })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/occurrences/:id/registrations', () => {
    it.skipIf(!isDbAvailable)('lists registrations for an occurrence', async () => {
      const response = await request(app)
        .get(`/api/occurrences/${testOccurrenceId}/registrations`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.registrations).toBeDefined()
      expect(Array.isArray(response.body.registrations)).toBe(true)
    })
  })

  describe('POST /api/occurrences/:id/checkins', () => {
    it.skipIf(!isDbAvailable)('creates check-in for a member', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/checkins`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          method: 'manual',
        })

      expect(response.status).toBe(201)
      expect(response.body.memberId).toBe(testMemberId)
      expect(response.body.method).toBe('manual')
      expect(response.body.checkedInAt).toBeDefined()
    })

    it.skipIf(!isDbAvailable)('creates check-in for a guest', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/checkins`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          guestName: 'Walk-in Guest',
          method: 'manual',
        })

      expect(response.status).toBe(201)
      expect(response.body.guestName).toBe('Walk-in Guest')
      expect(response.body.memberId).toBeNull()
    })

    it.skipIf(!isDbAvailable)('rejects check-in without member or guest info', async () => {
      const response = await request(app)
        .post(`/api/occurrences/${testOccurrenceId}/checkins`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'manual',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/occurrences/:id/checkins', () => {
    it.skipIf(!isDbAvailable)('lists check-ins for an occurrence', async () => {
      const response = await request(app)
        .get(`/api/occurrences/${testOccurrenceId}/checkins`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.checkIns).toBeDefined()
      expect(Array.isArray(response.body.checkIns)).toBe(true)
    })
  })
})

