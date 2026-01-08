import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { hashPassword } from '../lib/auth.js'

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

describeWithDb('Auth Routes', () => {
  let testUserId: string

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Create test user
    const passwordHash = await hashPassword('testPassword123')
    
    // Create permission and role for testing
    const permission = await prisma.permission.upsert({
      where: { key: 'admin.access' },
      update: {},
      create: { key: 'admin.access', description: 'Test permission' },
    })

    const role = await prisma.role.upsert({
      where: { name: 'test-admin' },
      update: {},
      create: { name: 'test-admin', description: 'Test admin role' },
    })

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

    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: { passwordHash },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        isActive: true,
      },
    })
    testUserId = user.id

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    })
  })

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { actorUserId: testUserId },
    })
    await prisma.userRole.deleteMany({
      where: { userId: testUserId },
    })
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    })
    await prisma.rolePermission.deleteMany({
      where: { role: { name: 'test-admin' } },
    })
    await prisma.role.deleteMany({
      where: { name: 'test-admin' },
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return

    // Clean up audit logs between tests
    await prisma.auditLog.deleteMany({
      where: { entityId: testUserId },
    })
  })

  describe('POST /api/auth/login', () => {
    it('returns 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Invalid email or password')
    })

    it.skipIf(!process.env.DATABASE_URL)('returns 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongPassword' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Invalid email or password')
    })

    it.skipIf(!process.env.DATABASE_URL)('returns token and user for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'testPassword123' })

      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
      expect(response.body.user).toBeDefined()
      expect(response.body.user.email).toBe('test@example.com')
      expect(response.body.user.roles).toContain('test-admin')
      expect(response.body.user.permissions).toContain('admin.access')
    })

    it.skipIf(!process.env.DATABASE_URL)('creates audit log for successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'testPassword123' })

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          actorUserId: testUserId,
          action: 'LOGIN_SUCCESS',
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.entityType).toBe('User')
    })

    it.skipIf(!process.env.DATABASE_URL)('creates audit log for failed login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongPassword' })

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          actorUserId: testUserId,
          action: 'LOGIN_FAILED',
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.entityType).toBe('User')
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const response = await request(app).get('/api/auth/me')

      expect(response.status).toBe(401)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns user info with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'testPassword123' })

      const token = loginResponse.body.token

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.email).toBe('test@example.com')
      expect(response.body.roles).toBeDefined()
      expect(response.body.permissions).toBeDefined()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('returns 401 without token', async () => {
      const response = await request(app).post('/api/auth/logout')

      expect(response.status).toBe(401)
    })

    it.skipIf(!process.env.DATABASE_URL)('returns success message with valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'testPassword123' })

      const token = loginResponse.body.token

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('Logged out successfully')
    })
  })
})

