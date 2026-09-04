import { describe, it, expect } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
import request from 'supertest'
import app from '../app.js'
import { signToken } from '../lib/auth.js'

// Staff token with checkin.operate — can activate a kiosk
const staffToken = signToken({
  orgId: TEST_ORG_ID,
  userId: 'test-staff-user',
  email: 'staff@example.com',
  roles: ['staff'],
  permissions: ['checkin.view', 'checkin.operate'],
}).accessToken

// Staff token WITHOUT checkin.operate — should get 403
const staffTokenNoOperate = signToken({
  orgId: TEST_ORG_ID,
  userId: 'test-readonly-user',
  email: 'readonly@example.com',
  roles: ['volunteer'],
  permissions: ['checkin.view'],
}).accessToken

// ============================================
// POST /api/kiosk/activate
// ============================================

describe('POST /api/kiosk/activate', () => {
  it('returns a kiosk token when staff has checkin.operate permission', async () => {
    const response = await request(app)
      .post('/api/kiosk/activate')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(response.status).toBe(200)
    expect(response.body.token).toBeDefined()
    expect(typeof response.body.token).toBe('string')
    expect(response.body.expiresAt).toBeDefined()

    // expiresAt should be ~8 hours from now
    const expiresAt = new Date(response.body.expiresAt)
    const nowPlusHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)
    expect(expiresAt.getTime()).toBeGreaterThan(nowPlusHours(7).getTime())
    expect(expiresAt.getTime()).toBeLessThan(nowPlusHours(9).getTime())
  })

  it('returns 403 when staff lacks checkin.operate permission', async () => {
    const response = await request(app)
      .post('/api/kiosk/activate')
      .set('Authorization', `Bearer ${staffTokenNoOperate}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toBe('Forbidden')
  })

  it('returns 401 when no token is provided', async () => {
    const response = await request(app).post('/api/kiosk/activate')

    expect(response.status).toBe(401)
    expect(response.body.error).toBeDefined()
  })
})

// ============================================
// GET /api/kiosk/status
// ============================================

describe('GET /api/kiosk/status', () => {
  it('returns active:true with valid kiosk token', async () => {
    // First activate to get a real kiosk token
    const activateResponse = await request(app)
      .post('/api/kiosk/activate')
      .set('Authorization', `Bearer ${staffToken}`)

    expect(activateResponse.status).toBe(200)
    const kioskToken: string = activateResponse.body.token

    // Then check status with that kiosk token
    const statusResponse = await request(app)
      .get('/api/kiosk/status')
      .set('Authorization', `Bearer ${kioskToken}`)

    expect(statusResponse.status).toBe(200)
    expect(statusResponse.body.active).toBe(true)
    expect(statusResponse.body.roles).toContain('kiosk')
  })

  it('returns 401 when no token is provided', async () => {
    const response = await request(app).get('/api/kiosk/status')

    expect(response.status).toBe(401)
    expect(response.body.error).toBeDefined()
  })
})
