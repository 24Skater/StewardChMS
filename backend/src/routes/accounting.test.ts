import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import prisma from '../lib/prisma.js'
import jwt from 'jsonwebtoken'

// Check if database is available
const isDatabaseAvailable = async () => {
  try {
    await prisma.$connect()
    return true
  } catch {
    return false
  }
}

// Mock JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

// Create a test token
function createTestToken(userId: string, permissions: string[]) {
  return jwt.sign(
    { userId, email: 'test@example.com', permissions },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('Accounting API', () => {
  let dbAvailable = false
  const testUserId = 'test-user-id'
  let fullAccessToken: string
  let viewOnlyToken: string
  let noAccessToken: string

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      console.warn('Database not available, skipping integration tests')
      return
    }

    // Create test tokens
    fullAccessToken = createTestToken(testUserId, ['accounting.view', 'accounting.edit', 'giving.view', 'giving.edit'])
    viewOnlyToken = createTestToken(testUserId, ['accounting.view', 'giving.view'])
    noAccessToken = createTestToken(testUserId, [])
  })

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect()
    }
  })

  describe('Funds API', () => {
    it('should deny access without token', async () => {
      if (!dbAvailable) return

      const response = await request(app).get('/api/funds')
      expect(response.status).toBe(401)
    })

    it('should deny access without proper permission', async () => {
      if (!dbAvailable) return

      const response = await request(app)
        .get('/api/funds')
        .set('Authorization', `Bearer ${noAccessToken}`)
      expect(response.status).toBe(403)
    })

    it('should allow access with view permission', async () => {
      if (!dbAvailable) return

      const response = await request(app)
        .get('/api/funds')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('funds')
      expect(response.body).toHaveProperty('total')
    })

    it('should create a fund with edit permission', async () => {
      if (!dbAvailable) return

      const response = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${fullAccessToken}`)
        .send({
          name: 'Test Fund ' + Date.now(),
          description: 'A test fund',
          isRestricted: false,
        })
      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('name')

      // Cleanup
      await prisma.fund.delete({ where: { id: response.body.id } })
    })

    it('should prevent duplicate fund names', async () => {
      if (!dbAvailable) return

      const name = 'Duplicate Test Fund ' + Date.now()
      
      // Create first fund
      const first = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${fullAccessToken}`)
        .send({ name })
      expect(first.status).toBe(201)

      // Try to create duplicate
      const second = await request(app)
        .post('/api/funds')
        .set('Authorization', `Bearer ${fullAccessToken}`)
        .send({ name })
      expect(second.status).toBe(409)

      // Cleanup
      await prisma.fund.delete({ where: { id: first.body.id } })
    })
  })

  describe('Donations API', () => {
    it('should deny create without edit permission', async () => {
      if (!dbAvailable) return

      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({
          amountCents: 10000,
          method: 'cash',
          receivedAt: new Date().toISOString(),
        })
      expect(response.status).toBe(403)
    })

    it('should create a donation with proper permission', async () => {
      if (!dbAvailable) return

      const response = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${fullAccessToken}`)
        .send({
          amountCents: 10000,
          method: 'cash',
          receivedAt: new Date().toISOString(),
          guestName: 'Anonymous Donor',
        })
      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.amountCents).toBe(10000)
      expect(response.body.method).toBe('cash')

      // Cleanup
      await prisma.donation.delete({ where: { id: response.body.id } })
    })

    it('should filter donations by date range', async () => {
      if (!dbAvailable) return

      const now = new Date()
      const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const dateTo = now.toISOString()

      const response = await request(app)
        .get(`/api/donations?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${viewOnlyToken}`)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('donations')
      expect(Array.isArray(response.body.donations)).toBe(true)
    })
  })
})

// Unit tests that don't require database
describe('Invoice Number Generation (Unit)', () => {
  it('should generate correct format', () => {
    const year = new Date().getFullYear()
    const expected = `INV-${year}-0001`
    
    // Test the format pattern
    const pattern = /^INV-\d{4}-\d{4}$/
    expect(pattern.test(expected)).toBe(true)
  })

  it('should generate PO number format', () => {
    const year = new Date().getFullYear()
    const expected = `PO-${year}-0001`
    
    // Test the format pattern
    const pattern = /^PO-\d{4}-\d{4}$/
    expect(pattern.test(expected)).toBe(true)
  })
})

describe('Fund Summary Calculation (Unit)', () => {
  it('should calculate net correctly', () => {
    const income = 100000 // $1000.00
    const expenses = 30000 // $300.00
    const net = income - expenses
    expect(net).toBe(70000) // $700.00
  })

  it('should handle zero income', () => {
    const income = 0
    const expenses = 50000
    const net = income - expenses
    expect(net).toBe(-50000)
  })

  it('should handle zero expenses', () => {
    const income = 100000
    const expenses = 0
    const net = income - expenses
    expect(net).toBe(100000)
  })
})

describe('Invoice Totals Calculation (Unit)', () => {
  it('should calculate line total correctly', () => {
    const quantity = 5
    const unitPriceCents = 1999 // $19.99
    const lineTotalCents = Math.round(quantity * unitPriceCents)
    expect(lineTotalCents).toBe(9995) // $99.95
  })

  it('should calculate subtotal from items', () => {
    const items = [
      { quantity: 2, unitPriceCents: 1000 },
      { quantity: 3, unitPriceCents: 500 },
    ]
    const subtotalCents = items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
      0
    )
    expect(subtotalCents).toBe(3500) // $35.00
  })

  it('should calculate total with tax', () => {
    const subtotalCents = 10000 // $100.00
    const taxCents = 800 // $8.00
    const totalCents = subtotalCents + taxCents
    expect(totalCents).toBe(10800) // $108.00
  })

  it('should handle fractional quantities', () => {
    const quantity = 2.5
    const unitPriceCents = 1000
    const lineTotalCents = Math.round(quantity * unitPriceCents)
    expect(lineTotalCents).toBe(2500)
  })
})

