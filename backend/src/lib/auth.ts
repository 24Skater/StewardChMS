import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { generateJti, isTokenBlacklisted, blacklistToken } from './security.js'

const SALT_ROUNDS = 12
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// ============================================
// Password Hashing
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT Token Management
// ============================================

export interface JwtPayload {
  userId: string
  email: string
  /**
   * The church this session belongs to.
   *
   * A token is issued for one organization and is worthless against another.
   * `requireAuth` compares this against the organization the hostname resolved
   * to, so a session for one church presented to another church's host is
   * rejected rather than quietly honoured.
   */
  orgId: string
  roles: string[]
  permissions: string[]
  isPrimaryAdmin?: boolean // Highest authority admin flag
  jti?: string // JWT ID for blacklisting
}

export interface TokenPair {
  accessToken: string
  expiresAt: Date
}

/**
 * Signs a new JWT token with a unique ID for blacklisting support.
 * @param payload - The JWT payload to sign.
 * @param expiresIn - Optional expiry override (e.g. '90d'). Defaults to JWT_EXPIRES_IN env var.
 */
export function signToken(payload: JwtPayload, expiresIn?: string): TokenPair {
  const jti = generateJti()
  const expiresIn_ = expiresIn ?? JWT_EXPIRES_IN
  
  // Parse expires in to calculate actual expiry date
  let expiresAt: Date
  const match = expiresIn_.match(/^(\d+)([dhms])$/)
  if (match) {
    const value = parseInt(match[1], 10)
    const unit = match[2]
    const ms = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    }[unit] || 0
    expiresAt = new Date(Date.now() + value * ms)
  } else {
    // Default to 7 days
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  const token = jwt.sign(
    { ...payload, jti },
    JWT_SECRET,
    { expiresIn: expiresIn_ } as SignOptions
  )

  return { accessToken: token, expiresAt }
}

/**
 * Verifies a JWT token and checks blacklist.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { jti?: string }
    
    // Check if token is blacklisted
    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}

/**
 * Decodes a token without verification (for debugging).
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Invalidates a token by adding it to the blacklist.
 */
export function invalidateToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JwtPayload & { jti?: string; exp?: number }
    if (decoded?.jti && decoded?.exp) {
      blacklistToken(decoded.jti, new Date(decoded.exp * 1000))
      return true
    }
    return false
  } catch {
    return false
  }
}

// ============================================
// Cookie Configuration
// ============================================

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
}

export const COOKIE_NAME = 'steward_session'
