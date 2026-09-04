import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { signToken, verifyToken, invalidateToken } from './auth.js'
import { blacklistToken, cleanupBlacklist, isTokenBlacklisted } from './security.js'
import { TEST_ORG_ID } from '../testing/org.js'

/**
 * The blacklist is the one part of authentication that has to be shared between
 * processes, so these tests use the real table rather than a stand-in. A fake
 * would pass while the thing this replaced was still broken.
 */

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

describeWithDb('the logout blacklist', () => {
  const db = new PrismaClient()
  const jti = 'test-jti-0000-1111-2222'

  const payload = {
    userId: 'blacklist-user',
    email: 'blacklist@test.example.com',
    orgId: TEST_ORG_ID,
    roles: ['admin'],
    permissions: ['admin.access'],
  }

  beforeAll(async () => {
    await db.revokedToken.deleteMany({ where: { jti: { startsWith: 'test-jti' } } })
  })

  afterAll(async () => {
    await db.revokedToken.deleteMany({ where: { jti: { startsWith: 'test-jti' } } })
    await db.$disconnect()
  })

  it('says nothing is revoked until something is', async () => {
    expect(await isTokenBlacklisted(jti)).toBe(false)
  })

  it('remembers a revocation', async () => {
    await blacklistToken(jti, new Date(Date.now() + 60_000))
    expect(await isTokenBlacklisted(jti)).toBe(true)
  })

  it('tolerates being told twice, without moving the record', async () => {
    const first = await db.revokedToken.findUnique({ where: { jti } })
    await blacklistToken(jti, new Date(Date.now() + 120_000))
    const second = await db.revokedToken.findUnique({ where: { jti } })

    // Logging out twice is not an error, and the second click must not rewrite
    // when the first one happened.
    expect(second?.revokedAt.getTime()).toBe(first?.revokedAt.getTime())
  })

  it('refuses a token after it is invalidated', async () => {
    const { accessToken } = signToken(payload)

    expect(await verifyToken(accessToken)).not.toBeNull()
    expect(await invalidateToken(accessToken)).toBe(true)

    // This is the whole point, and the thing the in-memory version could not do
    // for any process other than the one the logout landed on.
    expect(await verifyToken(accessToken)).toBeNull()

    const decoded = signToken(payload)
    expect(decoded.accessToken).not.toBe(accessToken)
  })

  it('forgets entries for tokens that have expired anyway', async () => {
    const stale = 'test-jti-expired'
    await blacklistToken(stale, new Date(Date.now() - 60_000))
    expect(await isTokenBlacklisted(stale)).toBe(true)

    // A token past its own expiry fails verification before the blacklist is
    // ever consulted, so keeping the row would grow the table to prevent
    // nothing.
    await cleanupBlacklist()
    expect(await isTokenBlacklisted(stale)).toBe(false)
  })

  it('keeps entries for tokens that have not', async () => {
    await blacklistToken('test-jti-live', new Date(Date.now() + 600_000))
    await cleanupBlacklist()
    expect(await isTokenBlacklisted('test-jti-live')).toBe(true)
  })
})
