import { describe, it, expect, afterAll } from 'vitest'
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

// Token with checkin.view permission
const checkinToken = signToken({
  orgId: TEST_ORG_ID,
  userId: 'test-checkin-user',
  email: 'checkin@example.com',
  roles: ['staff'],
  permissions: ['checkin.view', 'checkin.operate'],
}).accessToken

// Skip DB-dependent tests if no database
const describeWithDb = DATABASE_URL ? describe : describe.skip

// ============================================
// Auth-only tests (no DB required)
// ============================================

describe('GET /api/kids-checkin/lookup — auth checks', () => {
  it('returns 401 when unauthenticated', async () => {
    const response = await request(app).get('/api/kids-checkin/lookup?phone=5551234567')

    expect(response.status).toBe(401)
    expect(response.body.error).toBeDefined()
  })

  it('returns 400 for missing phone param', async () => {
    const response = await request(app)
      .get('/api/kids-checkin/lookup')
      .set('Authorization', `Bearer ${checkinToken}`)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Validation failed')
  })

  it('returns 400 for phone with fewer than 10 digits', async () => {
    const response = await request(app)
      .get('/api/kids-checkin/lookup?phone=123')
      .set('Authorization', `Bearer ${checkinToken}`)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Validation failed')
  })
})

// ============================================
// DB-dependent tests
// ============================================

describeWithDb('GET /api/kids-checkin/lookup — DB integration', () => {
  let householdId: string
  let parentMemberId: string
  let childMemberId: string

  afterAll(async () => {
    if (!prisma) return

    // Clean up test data in dependency order
    if (childMemberId) {
      await prisma.householdMember.deleteMany({ where: { memberId: childMemberId } })
      await prisma.member.deleteMany({ where: { id: childMemberId } })
    }
    if (parentMemberId) {
      await prisma.householdMember.deleteMany({ where: { memberId: parentMemberId } })
      await prisma.member.deleteMany({ where: { id: parentMemberId } })
    }
    if (householdId) {
      await prisma.household.deleteMany({ where: { id: householdId } })
    }

    await prisma.$disconnect()
  })

  it('returns children for a valid matching phone number', async () => {
    if (!prisma) return

    // Arrange: create household with parent + child
    const household = await prisma.household.create({
      data: { orgId: TEST_ORG_ID, name: 'Test Lookup Family' },
    })
    householdId = household.id

    const parent = await prisma.member.create({
      data: {
        orgId: TEST_ORG_ID,
        firstName: 'Test',
        lastName: 'Parent',
        phone: '(555) 999-0001',
        isChild: false,
        status: 'active',
      },
    })
    parentMemberId = parent.id

    const child = await prisma.member.create({
      data: {
        orgId: TEST_ORG_ID,
        firstName: 'Test',
        lastName: 'Child',
        isChild: true,
        status: 'active',
        allergies: 'Peanuts',
        medicalNotes: 'EpiPen required',
      },
    })
    childMemberId = child.id

    await prisma.householdMember.create({
      data: { orgId: TEST_ORG_ID, householdId, memberId: parentMemberId, relationshipType: 'parent' },
    })
    await prisma.householdMember.create({
      data: { orgId: TEST_ORG_ID, householdId, memberId: childMemberId, relationshipType: 'child' },
    })

    // Act: look up by parent's phone (formatted)
    const response = await request(app)
      .get('/api/kids-checkin/lookup?phone=5559990001')
      .set('Authorization', `Bearer ${checkinToken}`)

    expect(response.status).toBe(200)
    expect(response.body.children).toHaveLength(1)
    expect(response.body.children[0].id).toBe(childMemberId)
    expect(response.body.children[0].firstName).toBe('Test')
    expect(response.body.children[0].lastName).toBe('Child')
    expect(response.body.children[0].allergies).toBe('Peanuts')
    expect(response.body.children[0].medicalNotes).toBe('EpiPen required')
  })

  it('returns empty array when no household matches the phone', async () => {
    const response = await request(app)
      .get('/api/kids-checkin/lookup?phone=5550000000')
      .set('Authorization', `Bearer ${checkinToken}`)

    expect(response.status).toBe(200)
    expect(response.body.children).toEqual([])
  })
})
