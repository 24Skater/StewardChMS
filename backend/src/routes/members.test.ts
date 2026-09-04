import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
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
  orgId: TEST_ORG_ID,
  userId: 'test-user-id',
  email: 'test@example.com',
  roles: ['admin'],
  permissions: ['members.read', 'members.write', 'members.delete', 'members.notes'],
}).accessToken

// Token without notes permission
const tokenWithoutNotes = signToken({
  orgId: TEST_ORG_ID,
  userId: 'test-user-id',
  email: 'test@example.com',
  roles: ['staff'],
  permissions: ['members.read', 'members.write'],
}).accessToken

// Skip all tests if no database
const describeWithDb = DATABASE_URL ? describe : describe.skip

describeWithDb('Members API', () => {
  let testMemberId: string

  beforeEach(() => {
    if (!DATABASE_URL) {
      console.warn('⚠️ Database not available, skipping integration tests')
    }
  })

  afterAll(async () => {
    if (!prisma) return
    // Clean up test data
    if (testMemberId) {
      await prisma.member.deleteMany({
        where: { id: testMemberId },
      })
    }
    await prisma.member.deleteMany({
      where: { email: { contains: 'test-member' } },
    })
    await prisma.$disconnect()
  })

  describe('POST /api/members', () => {
    it('creates a member with valid data', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test-member-1@example.com',
          phone: '555-1234',
          status: 'active',
        })

      expect(response.status).toBe(201)
      expect(response.body.firstName).toBe('John')
      expect(response.body.lastName).toBe('Doe')
      expect(response.body.email).toBe('test-member-1@example.com')
      expect(response.body.id).toBeDefined()

      testMemberId = response.body.id
    })

    it('returns 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'John',
          // missing lastName
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it('returns 409 for duplicate email', async () => {
      // Create first member
      await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'test-member-duplicate@example.com',
        })

      // Try to create another with same email
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Another',
          lastName: 'Person',
          email: 'test-member-duplicate@example.com',
        })

      expect(response.status).toBe(409)
      expect(response.body.error).toContain('already exists')
    })

    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/members', () => {
    beforeAll(async () => {
      if (!prisma) return
      // Create some test members for search
      await prisma.member.createMany({
        data: [
          { orgId: TEST_ORG_ID, firstName: 'Alice', lastName: 'Smith', email: 'test-member-alice@example.com', status: 'active' },
          { orgId: TEST_ORG_ID, firstName: 'Bob', lastName: 'Smith', email: 'test-member-bob@example.com', status: 'active' },
          { orgId: TEST_ORG_ID, firstName: 'Charlie', lastName: 'Jones', email: 'test-member-charlie@example.com', status: 'visitor' },
        ],
      })
    })

    it('returns list of members', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.members).toBeDefined()
      expect(Array.isArray(response.body.members)).toBe(true)
      expect(response.body.total).toBeGreaterThan(0)
    })

    it('filters by search term', async () => {
      const response = await request(app)
        .get('/api/members?search=Smith')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.members.length).toBeGreaterThanOrEqual(2)
      expect(response.body.members.every((m: { lastName: string }) => m.lastName === 'Smith')).toBe(true)
    })

    it('filters by status', async () => {
      const response = await request(app)
        .get('/api/members?status=visitor')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.members.every((m: { status: string }) => m.status === 'visitor')).toBe(true)
    })

    it('supports pagination', async () => {
      const response = await request(app)
        .get('/api/members?page=1&limit=2')
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.members.length).toBeLessThanOrEqual(2)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(2)
    })
  })

  describe('PUT /api/members/:id', () => {
    it('updates a member', async () => {
      // First create a member
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Update',
          lastName: 'Test',
          email: 'test-member-update@example.com',
        })

      const memberId = createResponse.body.id

      // Then update it
      const response = await request(app)
        .put(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Updated',
          phone: '555-9999',
        })

      expect(response.status).toBe(200)
      expect(response.body.firstName).toBe('Updated')
      expect(response.body.phone).toBe('555-9999')
    })

    it('returns 404 for non-existent member', async () => {
      const response = await request(app)
        .put('/api/members/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Updated',
        })

      expect(response.status).toBe(404)
    })

    it('denies notes update without permission', async () => {
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Notes',
          lastName: 'Test',
          email: 'test-member-notes@example.com',
        })

      const memberId = createResponse.body.id

      const response = await request(app)
        .put(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${tokenWithoutNotes}`)
        .send({
          notes: 'Some sensitive notes',
        })

      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/members/:id', () => {
    it('soft deletes a member (sets inactive)', async () => {
      // First create a member
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          firstName: 'Delete',
          lastName: 'Test',
          email: 'test-member-delete@example.com',
        })

      const memberId = createResponse.body.id

      // Then delete it
      const response = await request(app)
        .delete(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${testToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('deleted')

      // Verify it's now inactive
      const member = await prisma!.member.findUnique({ where: { id: memberId } })
      expect(member?.status).toBe('inactive')
    })
  })
})

describeWithDb('CSV Import', () => {
  afterAll(async () => {
    if (!prisma) return
    await prisma.member.deleteMany({
      where: { email: { contains: 'csv-import' } },
    })
  })

  it('imports valid CSV data', async () => {
    const response = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        data: [
          { first_name: 'CSV', last_name: 'Import1', email: 'csv-import-1@example.com', phone: '555-0001' },
          { first_name: 'CSV', last_name: 'Import2', email: 'csv-import-2@example.com', phone: '555-0002' },
        ],
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(2)
    expect(response.body.failed).toBe(0)
  })

  it('reports errors for invalid rows', async () => {
    const response = await request(app)
      .post('/api/members/import')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        data: [
          { first_name: '', last_name: 'NoFirst' }, // missing first_name
          { first_name: 'Valid', last_name: 'Person', email: 'csv-import-valid@example.com' },
        ],
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(1)
    expect(response.body.failed).toBe(1)
    expect(response.body.errors.length).toBe(1)
    expect(response.body.errors[0].row).toBe(1)
  })
})

