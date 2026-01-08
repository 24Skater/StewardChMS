import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth.js'

// Type augmentation is in src/types/express.d.ts

/**
 * Middleware that requires a valid JWT token.
 * Extracts user info and attaches to request.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header provided' })
    return
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' })
    return
  }

  const token = parts[1]
  const payload = verifyToken(token)

  if (!payload) {
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
  const authHeader = req.headers.authorization

  if (authHeader) {
    const parts = authHeader.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1]
      const payload = verifyToken(token)
      if (payload) {
        req.user = payload
      }
    }
  }

  next()
}

