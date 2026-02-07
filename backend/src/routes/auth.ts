import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { hashPassword, verifyPassword, signToken, invalidateToken, COOKIE_OPTIONS, COOKIE_NAME } from '../lib/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { loginRateLimiter } from '../middleware/rateLimiter.js'
import { validatePassword } from '../lib/security.js'

const router = Router()

// Zod schemas (inline to avoid import issues before shared is built)
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
})

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = loginRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { email, password } = parseResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      // Log failed login attempt (user not found)
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          entityType: 'User',
          metadata: { email, reason: 'User not found' },
        },
      })

      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Check if user is active
    if (!user.isActive) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: { reason: 'Account inactive' },
        },
      })

      res.status(401).json({ error: 'Account is inactive' })
      return
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: { reason: 'Invalid password' },
        },
      })

      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Extract roles and permissions
    const roles: string[] = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name)
    const permissions: string[] = [
      ...new Set(
        user.userRoles.flatMap((ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
          ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
        )
      ),
    ]

    // Generate JWT
    const { accessToken, expiresAt } = signToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
    })

    // Log successful login
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        metadata: { roles, permissions },
      },
    })

    // Set httpOnly cookie
    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS)

    // Also return token in response body for API clients
    res.json({
      token: accessToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/auth/logout
// Now invalidates token via blacklist
// ============================================
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get the token for blacklisting
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.split(' ')[1]
    
    if (token) {
      invalidateToken(token)
    }

    // Log logout
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          actorUserId: req.user.userId,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: req.user.userId,
          metadata: {},
        },
      })
    }

    // Clear the cookie
    res.clearCookie(COOKIE_NAME, { path: '/' })

    res.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/auth/change-password
// ============================================
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const parseResult = changePasswordSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { currentPassword, newPassword } = parseResult.data

    // Validate password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      })
      return
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'PASSWORD_CHANGE_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: { reason: 'Invalid current password' },
        },
      })

      res.status(401).json({ error: 'Current password is incorrect' })
      return
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    // Log password change
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id,
        metadata: {},
      },
    })

    // Invalidate current token to force re-login
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.split(' ')[1]
    if (token) {
      invalidateToken(token)
    }
    res.clearCookie(COOKIE_NAME, { path: '/' })

    res.json({
      message: 'Password changed successfully. Please log in again.',
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/auth/validate-password
// Check password strength without changing
// ============================================
router.post('/validate-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' })
      return
    }

    const validation = validatePassword(password)

    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      score: validation.score,
      scoreLabel: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][validation.score],
    })
  } catch (error) {
    console.error('Validate password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const roles: string[] = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name)
    const permissions: string[] = [
      ...new Set(
        user.userRoles.flatMap((ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
          ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
        )
      ),
    ]

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roles,
      permissions,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Export for testing
export { hashPassword }

export default router
