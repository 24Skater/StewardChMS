import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
import { Request, Response, NextFunction } from 'express'
import { requireAuth, requirePermission } from './auth.js'
import { signToken } from '../lib/auth.js'

// Mock request/response/next
function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as Request
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

function createMockNext(): NextFunction {
  return vi.fn() as NextFunction
}

describe('requireAuth Middleware', () => {
  it('rejects request without token (no cookie or header)', () => {
    const req = createMockReq()
    const res = createMockRes()
    const next = createMockNext()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects request with invalid token in header', () => {
    const req = createMockReq({
      headers: { authorization: 'Bearer invalid.token.here' },
    })
    const res = createMockRes()
    const next = createMockNext()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows request with valid token in header', () => {
    const payload = {
      userId: 'user123',
      email: 'test@example.com',
      orgId: TEST_ORG_ID,
      roles: ['admin'],
      permissions: ['admin.access'],
    }
    const { accessToken } = signToken(payload)
    const req = createMockReq({
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const res = createMockRes()
    const next = createMockNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeDefined()
    expect(req.user?.userId).toBe(payload.userId)
    expect(req.user?.email).toBe(payload.email)
  })

  it('allows request with valid token in cookie', () => {
    const payload = {
      userId: 'user456',
      email: 'cookie@example.com',
      orgId: TEST_ORG_ID,
      roles: ['user'],
      permissions: ['users.read'],
    }
    const { accessToken } = signToken(payload)
    const req = createMockReq({
      cookies: { steward_session: accessToken },
    })
    const res = createMockRes()
    const next = createMockNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeDefined()
    expect(req.user?.userId).toBe(payload.userId)
    expect(req.user?.email).toBe(payload.email)
  })

  it('prefers cookie over header when both present', () => {
    const cookiePayload = {
      userId: 'cookie-user',
      email: 'cookie@example.com',
      orgId: TEST_ORG_ID,
      roles: ['user'],
      permissions: ['users.read'],
    }
    const headerPayload = {
      userId: 'header-user',
      email: 'header@example.com',
      orgId: TEST_ORG_ID,
      roles: ['admin'],
      permissions: ['admin.access'],
    }
    const { accessToken: cookieToken } = signToken(cookiePayload)
    const { accessToken: headerToken } = signToken(headerPayload)
    
    const req = createMockReq({
      cookies: { steward_session: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    })
    const res = createMockRes()
    const next = createMockNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user?.userId).toBe('cookie-user') // Should use cookie
  })
})

describe('requirePermission Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects request without user (should be called after requireAuth)', () => {
    const req = createMockReq()
    const res = createMockRes()
    const next = createMockNext()

    const middleware = requirePermission('admin.access')
    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects request without required permission', () => {
    const req = createMockReq()
    req.user = {
      userId: 'user123',
      email: 'test@example.com',
      orgId: TEST_ORG_ID,
      roles: ['user'],
      permissions: ['users.read'], // Does not have admin.access
    }
    const res = createMockRes()
    const next = createMockNext()

    const middleware = requirePermission('admin.access')
    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Missing required permission: admin.access',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows request with required permission', () => {
    const req = createMockReq()
    req.user = {
      userId: 'user123',
      email: 'test@example.com',
      orgId: TEST_ORG_ID,
      roles: ['admin'],
      permissions: ['admin.access', 'users.read'],
    }
    const res = createMockRes()
    const next = createMockNext()

    const middleware = requirePermission('admin.access')
    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
