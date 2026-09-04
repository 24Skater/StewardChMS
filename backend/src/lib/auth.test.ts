import { describe, it, expect } from 'vitest'
import { TEST_ORG_ID } from '../testing/org.js'
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js'

describe('Password Hashing', () => {
  it('hashes a password', async () => {
    const password = 'testPassword123'
    const hash = await hashPassword(password)
    
    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are ~60 chars
  })

  it('verifies a correct password', async () => {
    const password = 'testPassword123'
    const hash = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const password = 'testPassword123'
    const wrongPassword = 'wrongPassword456'
    const hash = await hashPassword(password)
    
    const isValid = await verifyPassword(wrongPassword, hash)
    expect(isValid).toBe(false)
  })

  it('produces different hashes for the same password', async () => {
    const password = 'testPassword123'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    
    // bcrypt uses random salt, so hashes should be different
    expect(hash1).not.toBe(hash2)
    
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)
  })
})

describe('JWT Token', () => {
  const testPayload = {
    userId: 'user123',
    email: 'test@example.com',
    orgId: TEST_ORG_ID,
    roles: ['admin'],
    permissions: ['admin.access'],
  }

  it('signs a token and returns TokenPair', () => {
    const { accessToken, expiresAt } = signToken(testPayload)
    
    expect(accessToken).toBeDefined()
    expect(typeof accessToken).toBe('string')
    expect(accessToken.split('.')).toHaveLength(3) // JWT has 3 parts
    expect(expiresAt).toBeInstanceOf(Date)
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('verifies a valid token', () => {
    const { accessToken } = signToken(testPayload)
    const decoded = verifyToken(accessToken)
    
    expect(decoded).toBeDefined()
    expect(decoded?.userId).toBe(testPayload.userId)
    expect(decoded?.email).toBe(testPayload.email)
    expect(decoded?.roles).toEqual(testPayload.roles)
    expect(decoded?.permissions).toEqual(testPayload.permissions)
  })

  it('returns null for invalid token', () => {
    const decoded = verifyToken('invalid.token.here')
    expect(decoded).toBeNull()
  })

  it('returns null for empty token', () => {
    const decoded = verifyToken('')
    expect(decoded).toBeNull()
  })

  it('returns null for malformed token', () => {
    const decoded = verifyToken('not-a-jwt')
    expect(decoded).toBeNull()
  })
})
