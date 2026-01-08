import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { hashPassword, verifyPassword, signToken } from '../lib/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Zod schemas (inline to avoid import issues before shared is built)
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req: Request, res: Response) => {
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
    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key)
        )
      ),
    ]

    // Generate JWT
    const token = signToken({
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

    res.json({
      token,
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
// Strategy: Stateless - client deletes token
// No server-side token blacklist required
// ============================================
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
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

    // Stateless logout: client is responsible for deleting the token
    // This endpoint exists for audit logging and potential future token blacklisting
    res.json({
      message: 'Logged out successfully. Please delete the token on client side.',
    })
  } catch (error) {
    console.error('Logout error:', error)
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

    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key)
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

