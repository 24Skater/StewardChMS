import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import { hashPassword, verifyPassword, signToken, invalidateToken, COOKIE_OPTIONS, COOKIE_NAME } from '../lib/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { loginRateLimiter } from '../middleware/rateLimiter.js'
import { validatePassword } from '../lib/security.js'
import { createAuditLog } from '../lib/audit.js'
import { EmailStubProvider } from '../providers/messaging/email-stub.js'

const emailProvider = new EmailStubProvider()
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost'

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

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
      await createAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { email, reason: 'User not found' },
      })

      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Check if user is active
    if (!user.isActive) {
      await createAuditLog({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'Account inactive' },
      })

      res.status(401).json({ error: 'Account is inactive' })
      return
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await createAuditLog({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'Invalid password' },
      })

      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    // Extract roles and permissions
    const roles: string[] = user.userRoles.map((ur: { role: { name: string } }) => ur.role.name)
    const permissionKeys = user.userRoles.flatMap((ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
      ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
    )
    const permissions: string[] = Array.from(new Set(permissionKeys))

    // Generate JWT
    const { accessToken, expiresAt } = signToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
      isPrimaryAdmin: user.isPrimaryAdmin,
    })

    // Log successful login
    await createAuditLog({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      metadata: { roles, permissions, isPrimaryAdmin: user.isPrimaryAdmin },
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
        isPrimaryAdmin: user.isPrimaryAdmin,
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
      await createAuditLog({
        actorUserId: req.user.userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user.userId,
        metadata: {},
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
      await createAuditLog({
        actorUserId: user.id,
        action: 'PASSWORD_CHANGE_FAILED',
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'Invalid current password' },
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
    await createAuditLog({
      actorUserId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      metadata: {},
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
    const permKeys = user.userRoles.flatMap((ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
      ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
    )
    const permissions: string[] = Array.from(new Set(permKeys))

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isPrimaryAdmin: user.isPrimaryAdmin,
      isSeedAccount: user.isSeedAccount,
      roles,
      permissions,
      createdAt: user.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/auth/forgot-password
// Request a password reset link (public)
// ============================================
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

router.post('/forgot-password', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Valid email address is required' })
      return
    }

    const { email } = parseResult.data

    // Always return the same response — never reveal if email exists
    const genericResponse = {
      message: 'If that email is registered, a password reset link has been sent.',
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      res.json(genericResponse)
      return
    }

    // Delete any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashResetToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const resetUrl = `${CORS_ORIGIN}/reset-password?token=${rawToken}`

    await emailProvider.send(
      email,
      'Reset your Steward password',
      `Hi ${user.name || 'there'},\n\nYou requested a password reset for your Steward account.\n\nReset link (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n– The Steward Team`
    )

    // Dev-mode helper: always print the reset URL clearly even if email fails
    console.log(`[RESET LINK] ► ${resetUrl}`)

    await createAuditLog({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email },
    })

    res.json(genericResponse)
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST /api/auth/reset-password
// Consume a reset token and set new password (public)
// ============================================
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
})

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { token, newPassword } = parseResult.data

    const tokenHash = hashResetToken(token)
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record) {
      res.status(400).json({ error: 'Invalid or expired reset link.' })
      return
    }

    if (record.usedAt) {
      res.status(400).json({ error: 'This reset link has already been used.' })
      return
    }

    if (record.expiresAt < new Date()) {
      res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      })
      return
    }

    const passwordHash = await hashPassword(newPassword)

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    // Invalidate current session cookie if present
    const sessionCookie = req.cookies?.[COOKIE_NAME]
    if (sessionCookie) {
      invalidateToken(sessionCookie)
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
    }

    await createAuditLog({
      actorUserId: record.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: record.userId,
    })

    res.json({ message: 'Password reset successfully. You can now sign in with your new password.' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Export for testing
export { hashPassword }

export default router
