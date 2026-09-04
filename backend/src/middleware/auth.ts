import { Request, Response, NextFunction } from 'express'
import { verifyToken, COOKIE_NAME } from '../lib/auth.js'
import prisma from '../lib/prisma.js'

// Type augmentation is in src/types/express.d.ts

/**
 * Extracts token from request (cookie or Authorization header).
 * Prefers cookie for security, falls back to header for API clients.
 */
function extractToken(req: Request): string | null {
  // First, try to get from httpOnly cookie
  const cookieToken = req.cookies?.[COOKIE_NAME]
  if (cookieToken) {
    return cookieToken
  }

  // Fall back to Authorization header for API clients
  const authHeader = req.headers.authorization
  if (authHeader) {
    const parts = authHeader.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1]
    }
  }

  return null
}

/**
 * Middleware that requires a valid JWT token.
 * Extracts user info and attaches to request.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req)

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const payload = verifyToken(token)

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  // A session belongs to one church. The hostname already decided which church
  // this request is for, and a token minted for a different one is not a
  // weaker session — it is somebody else's.
  if (req.org && payload.orgId !== req.org.orgId) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.user = payload
  next()
}

/**
 * Middleware factory that requires a specific permission.
 * Must be used after requireAuth.
 */
export function requirePermission(permissionKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!req.user.permissions.includes(permissionKey)) {
      res.status(403).json({ 
        error: 'Forbidden',
        message: `Missing required permission: ${permissionKey}`
      })
      return
    }

    next()
  }
}

/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req)

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      req.user = payload
    }
  }

  next()
}

/**
 * Middleware that requires the user to be the primary admin.
 * This is the highest authority level - used for critical operations like
 * managing the seed account.
 * 
 * SECURITY: Verifies against database, not just JWT, to prevent token tampering.
 * Must be used after requireAuth.
 */
export function requirePrimaryAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    try {
      // Verify primary admin status directly from database for security
      // (cannot trust JWT alone for this critical check)
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { isPrimaryAdmin: true, isActive: true },
      })

      if (!user) {
        res.status(401).json({ error: 'User not found' })
        return
      }

      if (!user.isActive) {
        res.status(401).json({ error: 'Account is inactive' })
        return
      }

      if (!user.isPrimaryAdmin) {
        res.status(403).json({ 
          error: 'Forbidden',
          message: 'This action requires primary admin privileges'
        })
        return
      }

      next()
    } catch (error) {
      console.error('Primary admin verification error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
