import crypto from 'crypto'
import prisma from './prisma.js'

// ============================================
// Environment Validation
// ============================================

const REQUIRED_ENV_VARS = ['DATABASE_URL']
// Note: JWT_SECRET is checked separately in production with custom validation

/**
 * Validates that all required environment variables are set.
 * In production, also validates that sensitive vars are not using defaults.
 */
export function validateEnvironment(): void {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }

  // Check sensitive vars in production
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      errors.push('JWT_SECRET must be set in production')
    } else if (
      jwtSecret === 'dev-secret-change-in-production' ||
      jwtSecret === 'change-this-in-production-please' ||
      jwtSecret.length < 32
    ) {
      errors.push('JWT_SECRET is using an insecure default value. Generate a secure random secret.')
    }

    // Check CORS origin
    const corsOrigin = process.env.CORS_ORIGIN
    if (corsOrigin === '*') {
      errors.push('CORS_ORIGIN cannot be wildcard (*) in production')
    }
  }

  // Log warnings
  for (const warning of warnings) {
    console.warn(`Security Warning: ${warning}`)
  }

  // Throw on errors
  if (errors.length > 0) {
    console.error('Security validation failed:')
    for (const error of errors) {
      console.error(`   - ${error}`)
    }
    if (isProduction) {
      process.exit(1)
    }
  }
}

// ============================================
// Password Validation
// ============================================

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  score: number // 0-4 strength score
}

const MIN_PASSWORD_LENGTH = 12
const PASSWORD_PATTERNS = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
}

/**
 * Validates password strength according to ASVS requirements.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  // Length check
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  } else {
    score++
    if (password.length >= 16) score++
  }

  // Complexity checks
  if (PASSWORD_PATTERNS.lowercase.test(password)) score++
  if (PASSWORD_PATTERNS.uppercase.test(password)) score++
  if (PASSWORD_PATTERNS.number.test(password)) score++
  if (PASSWORD_PATTERNS.special.test(password)) score++

  // At least 3 character types required
  const charTypes = [
    PASSWORD_PATTERNS.lowercase.test(password),
    PASSWORD_PATTERNS.uppercase.test(password),
    PASSWORD_PATTERNS.number.test(password),
    PASSWORD_PATTERNS.special.test(password),
  ].filter(Boolean).length

  if (charTypes < 3) {
    errors.push('Password must contain at least 3 of: lowercase, uppercase, number, special character')
  }

  // Common patterns to reject
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+$/i, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
    /password/i,
    /admin/i,
    /qwerty/i,
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains a common pattern or word')
      break
    }
  }

  // Normalize score to 0-4
  score = Math.min(4, Math.floor(score / 1.5))

  return {
    isValid: errors.length === 0,
    errors,
    score,
  }
}

// ============================================
// Token Generation
// ============================================

/**
 * Generates a cryptographically secure random token.
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generates a JWT ID (jti) for token tracking.
 */
export function generateJti(): string {
  return crypto.randomUUID()
}

// ============================================
// Token Blacklist
// ============================================

/**
 * Logging out has to mean logged out on every instance.
 *
 * This used to be an array in one process's memory. That is correct on one
 * process and wrong on two: the second instance never heard about the logout,
 * so a "revoked" token kept working there until it expired on its own, up to
 * seven days later. It also emptied on every restart and deploy.
 *
 * It is a table rather than a Redis key because Congregation already has a
 * database and does not already have a Redis, and one more piece of
 * infrastructure to run is a real cost for a church hosting its own copy.
 *
 * The check is one primary-key lookup on a small table, on authenticated
 * requests only. There is deliberately no cache in front of it: a cache with
 * any staleness at all means a logged-out token still works for that long,
 * which is the exact thing this exists to prevent.
 */

const REVOCATION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Adds a token to the blacklist.
 *
 * Idempotent: logging out twice is not an error, and the second call must not
 * move the recorded revocation time.
 */
export async function blacklistToken(jti: string, expiresAt: Date): Promise<void> {
  await prisma.revokedToken.upsert({
    where: { jti },
    update: {},
    create: { jti, expiresAt },
  })
}

/** Checks if a token is blacklisted. */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const revoked = await prisma.revokedToken.findUnique({
    where: { jti },
    select: { jti: true },
  })
  return revoked !== null
}

/**
 * Deletes entries for tokens that have expired anyway.
 *
 * A token past its own expiry fails verification before the blacklist is ever
 * consulted, so keeping the row would grow the table forever to prevent nothing.
 */
export async function cleanupBlacklist(): Promise<number> {
  const { count } = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return count
}

// Run cleanup periodically. Several instances doing this at once is harmless -
// the delete is idempotent and takes no lock anyone is waiting on.
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cleanupBlacklist().catch((error) => {
      console.error('Failed to clean up revoked tokens:', error)
    })
  }, REVOCATION_CLEANUP_INTERVAL_MS)
}

// ============================================
// Request Sanitization
// ============================================

/**
 * Strips sensitive fields from objects before logging.
 */
export function redactSensitiveData(
  data: Record<string, unknown>,
  sensitiveFields = ['password', 'passwordHash', 'token', 'authorization', 'cookie']
): Record<string, unknown> {
  const redacted = { ...data }

  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]'
    }
  }

  return redacted
}

