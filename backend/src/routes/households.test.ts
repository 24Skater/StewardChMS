import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { signToken } from '../lib/auth.js'

// Check if database is available
const DATABASE_URL = process.env.DATABASE_URL
let prisma: PrismaClient | null = null

if (DATABASE_URL) {
  prisma = new PrismaClient()
}

// Test token with member permissions
const testToken = signToken({
  userId: 'test-user-id',
  email: 'test@example.com',
  roles: ['admin'],
  permissions: ['members.read', 'members.write', 'members.delete'],
}).accessToken

// Skip all tests if no database
const describeWithDb = DATABASE_URL ? describe : describe.skip

describeWithDb('Households API', () => {
  let testHouseholdId: string
  let testMemberId1: string
  let testMemberId2: string

  beforeAll(async () => {
    if (!prisma) return
    if (!DATABASE_URL) {
      console.warn('⚠️ Database not available, skipping integration tests')
      return
    }
    // Create test members
    const member1 = await prisma.member.create({
      data: {
        firstName: 'Household',
        lastName: 'TestMember1',
        email: 'household-test-1@example.com',
        status: 'active',
      },
    })
    const member2 = await prisma.member.create({
      data: {
        firstName: 'Household',
        lastName: 'TestMember2',
        email: 'household-test-2@example.com',
        status: 'active',
      },
    })
    testMemberId1 = member1.id
    testMemberId2 = member2.id
  })

  afterAll(async () => {
    if (!prisma) return
    // Clean up
    if (testHouseholdId) {
      await prisma.householdMember.deleteMany({ where: { householdId: testHouseholdId } })
      await prisma.household.deleteMany({ where: { id: testHouseholdId } })
    }
    await prisma.member.deleteMany({
      where: { email: { contains: 'household-test' } },
    })
    await prisma.$disconnect()
  })

  describe('POST /api/households', () => {
    it('creates a household', async () => {
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Family',
        })

      expect(response.status).toBe(201)
      expect(response.body.name).toBe('Test Family')
      expect(response.body.id).toBeDefined()
      expect(response.body.members).toEqual([])

      testHouseholdId = response.body.id
    })

    it('creates a household without name', async () => {
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${testToken}`)
        .send({})

      expect(response.status).toBe(201)
      expect(response.body.name).toBeNull()

      // Clean up
      await prisma!.household.delete({ where: { id: response.body.id } })
    })
  })

  describe('GET /api/households/:id', () => {
    it('returns a household with members', async () => {
      const response = await request(app)
        .get(`/api/households/${testHouseholdId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(testHouseholdId)
      expect(response.body.name).toBe('Test Family')
    })

    it('returns 404 for non-existent household', async () => {
      const response = await request(app)
        .get('/api/households/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/households/:id/members - Link member', () => {
    it('links a member to household', async () => {
      const response = await request(app)
        .post(`/api/households/${testHouseholdId}/members`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          memberId: testMemberId1,
          relationshipType: 'parent',
        })

      expect(response.status).toBe(201)
      expect(response.body.memberId).toBe(testMemberId1)
      expect(response.body.relationshipType).toBe('parent')
    })

    it('links another member with different relationship', async () => {
      const response = await request(app)
        .post(`/api/households/${testHouseholdId}/members`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          memberId: testMemberId2,
          relationshipType: 'child',
        })

      expect(response.status).toBe(201)
      expect(response.body.memberId).toBe(testMemberId2)
      expect(response.body.relationshipType).toBe('child')
    })

    it('prevents duplicate member links', async () => {
      const response = await request(app)
        .post(`/api/households/${testHouseholdId}/members`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          memberId: testMemberId1,
          relationshipType: 'spouse',
        })

      expect(response.status).toBe(409)
      expect(response.body.error).toContain('already linked')
    })

    it('returns 404 for non-existent member', async () => {
      const response = await request(app)
        .post(`/api/households/${testHouseholdId}/members`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          memberId: 'non-existent-member-id',
          relationshipType: 'other',
        })

      expect(response.status).toBe(404)
    })

    it('validates relationship type', async () => {
      const response = await request(app)
        .post(`/api/households/${testHouseholdId}/members`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          memberId: testMemberId1,
          relationshipType: 'invalid-type',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('Household with members', () => {
    it('returns household with all linked members', async () => {
      const response = await request(app)
        .get(`/api/households/${testHouseholdId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.members.length).toBe(2)
      expect(response.body.members.some((m: { relationshipType: string }) => m.relationshipType === 'parent')).toBe(true)
      expect(response.body.members.some((m: { relationshipType: string }) => m.relationshipType === 'child')).toBe(true)
    })
  })

  describe('DELETE /api/households/:id/members/:memberId - Unlink member', () => {
    it('unlinks a member from household', async () => {
      const response = await request(app)
        .delete(`/api/households/${testHouseholdId}/members/${testMemberId2}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('unlinked')

      // Verify member is unlinked
      const household = await request(app)
        .get(`/api/households/${testHouseholdId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(household.body.members.length).toBe(1)
    })

    it('returns 404 for non-linked member', async () => {
      const response = await request(app)
        .delete(`/api/households/${testHouseholdId}/members/${testMemberId2}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/households/:id', () => {
    it('deletes a household', async () => {
      // Create a new household to delete
      const createResponse = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'To Delete' })

      const householdId = createResponse.body.id

      const response = await request(app)
        .delete(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('deleted')

      // Verify it's gone
      const getResponse = await request(app)
        .get(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(getResponse.status).toBe(404)
    })
  })
})

