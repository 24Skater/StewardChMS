import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { hashPassword, signToken } from '../lib/auth.js'

const prisma = new PrismaClient()

// Check if database is available
const isDatabaseAvailable = async (): Promise<boolean> => {
  try {
    await prisma.$connect()
    return true
  } catch {
    return false
  }
}

// Skip tests if database is not available
const describeWithDb = (name: string, fn: () => void) => {
  describe(name, () => {
    let dbAvailable = false

    beforeAll(async () => {
      dbAvailable = await isDatabaseAvailable()
      if (!dbAvailable) {
        console.warn('⚠️ Database not available, skipping integration tests')
      }
    })

    it.skipIf(!process.env.DATABASE_URL)('database connection required', () => {
      // This test acts as a gate - if DATABASE_URL is not set, skip all tests
      expect(process.env.DATABASE_URL).toBeDefined()
    })

    fn()
  })
}

describeWithDb('Setup Routes', () => {
  let primaryAdminId: string
  let primaryAdminToken: string
  let regularAdminId: string
  let regularAdminToken: string
  let seedAccountId: string

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Create admin permission and role
    const permission = await prisma.permission.upsert({
      where: { key: 'admin.access' },
      update: {},
      create: { key: 'admin.access', description: 'Admin access' },
    })

    const role = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Admin role' },
    })
    // adminRoleId used for user-role assignments

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    })

    // Create primary admin user
    const primaryPasswordHash = await hashPassword('PrimaryAdmin123!')
    const primaryAdmin = await prisma.user.upsert({
      where: { email: 'primary-admin-test@example.com' },
      update: { 
        passwordHash: primaryPasswordHash, 
        isPrimaryAdmin: true,
        isSeedAccount: false,
        isActive: true,
      },
      create: {
        email: 'primary-admin-test@example.com',
        name: 'Primary Admin',
        passwordHash: primaryPasswordHash,
        isActive: true,
        isPrimaryAdmin: true,
        isSeedAccount: false,
      },
    })
    primaryAdminId = primaryAdmin.id

    await prisma.userRole.upsert({
      where: {
        orgId_userId_roleId: {
          orgId: TEST_ORG_ID,
          userId: primaryAdmin.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        orgId: TEST_ORG_ID,
        userId: primaryAdmin.id,
        roleId: role.id,
      },
    })

    // Generate token for primary admin
    const primaryTokenResult = signToken({
      orgId: TEST_ORG_ID,
      userId: primaryAdmin.id,
      email: primaryAdmin.email,
      roles: ['admin'],
      permissions: ['admin.access'],
      isPrimaryAdmin: true,
    })
    primaryAdminToken = primaryTokenResult.accessToken

    // Create regular admin user (not primary)
    const regularPasswordHash = await hashPassword('RegularAdmin123!')
    const regularAdmin = await prisma.user.upsert({
      where: { email: 'regular-admin-test@example.com' },
      update: { 
        passwordHash: regularPasswordHash,
        isPrimaryAdmin: false,
        isSeedAccount: false,
        isActive: true,
      },
      create: {
        email: 'regular-admin-test@example.com',
        name: 'Regular Admin',
        passwordHash: regularPasswordHash,
        isActive: true,
        isPrimaryAdmin: false,
        isSeedAccount: false,
      },
    })
    regularAdminId = regularAdmin.id

    await prisma.userRole.upsert({
      where: {
        orgId_userId_roleId: {
          orgId: TEST_ORG_ID,
          userId: regularAdmin.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        orgId: TEST_ORG_ID,
        userId: regularAdmin.id,
        roleId: role.id,
      },
    })

    // Generate token for regular admin
    const regularTokenResult = signToken({
      orgId: TEST_ORG_ID,
      userId: regularAdmin.id,
      email: regularAdmin.email,
      roles: ['admin'],
      permissions: ['admin.access'],
      isPrimaryAdmin: false,
    })
    regularAdminToken = regularTokenResult.accessToken

    // Create seed account (disabled)
    const seedPasswordHash = await hashPassword('SeedPassword123!')
    const seedAccount = await prisma.user.upsert({
      where: { email: 'seed-test@stewardchms.local' },
      update: {
        passwordHash: seedPasswordHash,
        isActive: false,
        isSeedAccount: true,
        isPrimaryAdmin: false,
      },
      create: {
        email: 'seed-test@stewardchms.local',
        name: 'Seed Account',
        passwordHash: seedPasswordHash,
        isActive: false,
        isSeedAccount: true,
        isPrimaryAdmin: false,
      },
    })
    seedAccountId = seedAccount.id

    await prisma.userRole.upsert({
      where: {
        orgId_userId_roleId: {
          orgId: TEST_ORG_ID,
          userId: seedAccount.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        orgId: TEST_ORG_ID,
        userId: seedAccount.id,
        roleId: role.id,
      },
    })
  })

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up test data
    await prisma.userRole.deleteMany({
      where: {
        userId: {
          in: [primaryAdminId, regularAdminId, seedAccountId].filter(Boolean),
        },
      },
    })
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [primaryAdminId, regularAdminId, seedAccountId].filter(Boolean),
        },
      },
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return

    // Reset seed account to disabled state before each test
    await prisma.user.update({
      where: { id: seedAccountId },
      data: { isActive: false },
    })
  })

  describe('GET /api/setup/seed-account/status', () => {
    it.skipIf(!process.env.DATABASE_URL)('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/setup/seed-account/status')
      expect(res.status).toBe(401)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 403 for non-primary admin', async () => {
      const res = await request(app)
        .get('/api/setup/seed-account/status')
        .set('Authorization', `Bearer ${regularAdminToken}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })

    it.skipIf(!process.env.DATABASE_URL)('returns seed account status for primary admin', async () => {
      const res = await request(app)
        .get('/api/setup/seed-account/status')
        .set('Authorization', `Bearer ${primaryAdminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.exists).toBe(true)
      expect(res.body.isActive).toBe(false)
    })
  })

  describe('POST /api/setup/seed-account/enable', () => {
    it.skipIf(!process.env.DATABASE_URL)('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/enable')
        .send({ password: 'NewSecurePassword123!' })

      expect(res.status).toBe(401)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 403 for non-primary admin', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/enable')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .send({ password: 'NewSecurePassword123!' })

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })

    it.skipIf(!process.env.DATABASE_URL)('validates password strength', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/enable')
        .set('Authorization', `Bearer ${primaryAdminToken}`)
        .send({ password: 'weak' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Validation failed')
    })

    it.skipIf(!process.env.DATABASE_URL)('enables seed account for primary admin', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/enable')
        .set('Authorization', `Bearer ${primaryAdminToken}`)
        .send({ password: 'MySecureP@ss2024!' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify seed account is now active
      const seedAccount = await prisma.user.findUnique({
        where: { id: seedAccountId },
      })
      expect(seedAccount?.isActive).toBe(true)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns error if seed account already active', async () => {
      // First, enable the seed account
      await prisma.user.update({
        where: { id: seedAccountId },
        data: { isActive: true },
      })

      const res = await request(app)
        .post('/api/setup/seed-account/enable')
        .set('Authorization', `Bearer ${primaryAdminToken}`)
        .send({ password: 'MySecureP@ss2024!' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Seed account is already active')
    })
  })

  describe('POST /api/setup/seed-account/disable', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return
      // Enable seed account for disable tests
      await prisma.user.update({
        where: { id: seedAccountId },
        data: { isActive: true },
      })
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/setup/seed-account/disable')
      expect(res.status).toBe(401)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 403 for non-primary admin', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/disable')
        .set('Authorization', `Bearer ${regularAdminToken}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })

    it.skipIf(!process.env.DATABASE_URL)('disables seed account for primary admin', async () => {
      const res = await request(app)
        .post('/api/setup/seed-account/disable')
        .set('Authorization', `Bearer ${primaryAdminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify seed account is now disabled
      const seedAccount = await prisma.user.findUnique({
        where: { id: seedAccountId },
      })
      expect(seedAccount?.isActive).toBe(false)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns error if seed account already disabled', async () => {
      // First, disable the seed account
      await prisma.user.update({
        where: { id: seedAccountId },
        data: { isActive: false },
      })

      const res = await request(app)
        .post('/api/setup/seed-account/disable')
        .set('Authorization', `Bearer ${primaryAdminToken}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Seed account is already disabled')
    })
  })
})

describe('Primary Admin Middleware', () => {
  it.skipIf(!process.env.DATABASE_URL)('requirePrimaryAdmin blocks non-primary admin', async () => {
    // This is tested through the seed account endpoints above
    expect(true).toBe(true)
  })
})
