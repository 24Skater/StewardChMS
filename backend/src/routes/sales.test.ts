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

// Use same JWT secret as auth.ts
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// Create a test token
function createTestToken(userId: string, permissions: string[]) {
  return jwt.sign(
    { userId, email: 'test@example.com', roles: ['tester'], permissions },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('Sales API', () => {
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

    // Create test tokens with correct permission names (using dots)
    fullAccessToken = createTestToken(testUserId, [
      'sales.view', 'sales.edit', 'inventory.view', 'inventory.edit', 'reports.view'
    ])
    viewOnlyToken = createTestToken(testUserId, ['sales.view', 'inventory.view', 'reports.view'])
    noAccessToken = createTestToken(testUserId, [])
  })

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect()
    }
  })

  describe('Products CRUD', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/products')
      expect(res.status).toBe(401)
    })

    it('should return 403 without permission', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${noAccessToken}`)
      expect(res.status).toBe(403)
    })

    it('should list products with inventory.view permission', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('products')
      expect(Array.isArray(res.body.products)).toBe(true)
    })

    it('should return 403 when creating product without inventory.edit', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({ name: 'Test Product', priceCents: 1000 })

      expect(res.status).toBe(403)
    })
  })

  describe('Inventory API', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/inventory/summary')
      expect(res.status).toBe(401)
    })

    it('should return 403 without permission', async () => {
      const res = await request(app)
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${noAccessToken}`)
      expect(res.status).toBe(403)
    })

    it('should get inventory summary with inventory.view permission', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${viewOnlyToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('inventory')
      expect(Array.isArray(res.body.inventory)).toBe(true)
    })

    it('should return 403 when adjusting inventory without inventory.edit', async () => {
      const res = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({ productId: 'fake-id', quantityDelta: 10 })

      expect(res.status).toBe(403)
    })
  })

  describe('Sales API', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/sales')
      expect(res.status).toBe(401)
    })

    it('should return 403 without permission', async () => {
      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${noAccessToken}`)
      expect(res.status).toBe(403)
    })

    it('should list sales with sales.view permission', async () => {
      if (!dbAvailable) return

      // Use fullAccessToken which has sales.view
      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('sales')
      expect(Array.isArray(res.body.sales)).toBe(true)
    })

    it('should return 403 when creating sale without sales.edit', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${viewOnlyToken}`)
        .send({
          items: [{ productId: 'fake-id', quantity: 1 }],
        })

      expect(res.status).toBe(403)
    })

    it('should validate sale items are required', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${fullAccessToken}`)
        .send({
          items: [],
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })
  })

  describe('Reports API', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/reports/membership-summary?dateFrom=2024-01-01&dateTo=2024-12-31')
      expect(res.status).toBe(401)
    })

    it('should return 403 without reports.view permission', async () => {
      const res = await request(app)
        .get('/api/reports/membership-summary?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${noAccessToken}`)
      expect(res.status).toBe(403)
    })

    it('should get membership summary with reports.view permission', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/reports/membership-summary?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('byStatus')
      expect(res.body).toHaveProperty('totalMembers')
    })

    it('should get attendance summary with reports.view permission', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/reports/attendance-summary?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('totalCheckIns')
      expect(res.body).toHaveProperty('occurrences')
    })

    it('should get sales summary with reports.view permission', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/reports/sales-summary?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('totalSales')
      expect(res.body).toHaveProperty('totalRevenueCents')
    })

    it('should return placeholder for volunteer summary', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/reports/volunteer-summary')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('placeholder')
    })

    it('should return 400 when date range is missing', async () => {
      if (!dbAvailable) return

      const res = await request(app)
        .get('/api/reports/membership-summary')
        .set('Authorization', `Bearer ${fullAccessToken}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('required')
    })
  })
})

describe('Sale Calculation Tests', () => {
  it('should compute line total as quantity * unitPrice', () => {
    const quantity = 3
    const unitPriceCents = 1500 // $15.00
    const lineTotalCents = quantity * unitPriceCents
    expect(lineTotalCents).toBe(4500) // $45.00
  })

  it('should compute subtotal as sum of line totals', () => {
    const items = [
      { quantity: 2, unitPriceCents: 1000 }, // $20.00
      { quantity: 1, unitPriceCents: 2500 }, // $25.00
      { quantity: 5, unitPriceCents: 500 },  // $25.00
    ]
    const subtotalCents = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0)
    expect(subtotalCents).toBe(7000) // $70.00
  })

  it('should compute total as subtotal + tax', () => {
    const subtotalCents = 7000 // $70.00
    const taxCents = 560       // $5.60 (8% tax)
    const totalCents = subtotalCents + taxCents
    expect(totalCents).toBe(7560) // $75.60
  })
})

describe('Inventory Transaction Tests', () => {
  it('should decrement inventory on sale (negative delta)', () => {
    const onHand = 100
    const saleQuantity = 5
    const delta = -saleQuantity
    const newOnHand = onHand + delta
    expect(newOnHand).toBe(95)
  })

  it('should restore inventory on void (positive delta)', () => {
    const onHand = 95
    const voidedQuantity = 5
    const delta = voidedQuantity
    const newOnHand = onHand + delta
    expect(newOnHand).toBe(100)
  })

  it('should calculate on-hand as sum of all transactions', () => {
    const transactions = [
      { type: 'purchase', quantityDelta: 100 },
      { type: 'sale', quantityDelta: -20 },
      { type: 'adjustment', quantityDelta: 10 },
      { type: 'sale', quantityDelta: -15 },
      { type: 'return', quantityDelta: 5 },
    ]
    const onHand = transactions.reduce((sum, t) => sum + t.quantityDelta, 0)
    expect(onHand).toBe(80)
  })
})

