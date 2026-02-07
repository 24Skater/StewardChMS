import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { hashPassword, signToken, COOKIE_OPTIONS, COOKIE_NAME } from '../lib/auth.js'
import { validatePassword, generateSecureToken } from '../lib/security.js'

const router = Router()

// ============================================
// Schemas
// ============================================

const setupStep1Schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(1, 'Name is required'),
})

const setupStep2Schema = z.object({
  churchName: z.string().min(1, 'Church name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().default('America/New_York'),
  currency: z.string().default('USD'),
})

const setupStep3Schema = z.object({
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2563EB'),
  tagline: z.string().optional(),
})

const setupStep4Schema = z.object({
  emailProvider: z.enum(['none', 'smtp', 'sendgrid']).default('none'),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
})

// ============================================
// GET /api/setup/status
// Check if setup is needed
// ============================================
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count()
    
    // Check if setup has been completed
    const setupComplete = await prisma.setting.findUnique({
      where: { category_key: { category: 'system', key: 'setup_complete' } },
    })

    res.json({
      needsSetup: userCount === 0 || !setupComplete,
      hasUsers: userCount > 0,
      isComplete: !!setupComplete?.value,
    })
  } catch (error) {
    console.error('Setup status error:', error)
    res.status(500).json({ error: 'Failed to check setup status' })
  }
})

// ============================================
// POST /api/setup/step1 - Create Admin Account
// ============================================
router.post('/step1', async (req: Request, res: Response) => {
  try {
    // Check if users already exist
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      res.status(400).json({ error: 'Setup has already been completed. Users exist.' })
      return
    }

    const parseResult = setupStep1Schema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { email, password, name } = parseResult.data

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      })
      return
    }

    // Create admin role if it doesn't exist
    let adminRole = await prisma.role.findUnique({ where: { name: 'admin' } })
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          description: 'System Administrator with full access',
        },
      })
    }

    // Ensure all permissions exist and are assigned to admin
    const permissions = await prisma.permission.findMany()
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      })
    }

    // Create admin user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        isActive: true,
        userRoles: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
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

    // Generate JWT secret and store it
    const jwtSecret = generateSecureToken(64)
    await prisma.setting.upsert({
      where: { category_key: { category: 'security', key: 'jwt_secret' } },
      update: { value: jwtSecret, updatedBy: user.id },
      create: { category: 'security', key: 'jwt_secret', value: jwtSecret, updatedBy: user.id },
    })

    // Mark step 1 complete
    await prisma.setting.upsert({
      where: { category_key: { category: 'setup', key: 'step1_complete' } },
      update: { value: true, updatedBy: user.id },
      create: { category: 'setup', key: 'step1_complete', value: true, updatedBy: user.id },
    })

    // Generate token for the new user
    const roles = user.userRoles.map((ur) => ur.role.name)
    const userPermissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key)
        )
      ),
    ]

    const { accessToken, expiresAt } = signToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions: userPermissions,
    })

    // Set cookie
    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS)

    // Log setup
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'SETUP_STEP1_COMPLETE',
        entityType: 'User',
        entityId: user.id,
        metadata: { email },
      },
    })

    res.json({
      success: true,
      token: accessToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions: userPermissions,
      },
    })
  } catch (error) {
    console.error('Setup step 1 error:', error)
    res.status(500).json({ error: 'Failed to create admin account' })
  }
})

// ============================================
// POST /api/setup/step2 - Church Profile
// ============================================
router.post('/step2', async (req: Request, res: Response) => {
  try {
    const parseResult = setupStep2Schema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Store church profile settings
    const settings = [
      { category: 'church', key: 'name', value: data.churchName },
      { category: 'church', key: 'address', value: data.address || '' },
      { category: 'church', key: 'city', value: data.city || '' },
      { category: 'church', key: 'state', value: data.state || '' },
      { category: 'church', key: 'zip', value: data.zip || '' },
      { category: 'church', key: 'phone', value: data.phone || '' },
      { category: 'church', key: 'website', value: data.website || '' },
      { category: 'church', key: 'timezone', value: data.timezone },
      { category: 'church', key: 'currency', value: data.currency },
    ]

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { category_key: { category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: setting,
      })
    }

    // Mark step 2 complete
    await prisma.setting.upsert({
      where: { category_key: { category: 'setup', key: 'step2_complete' } },
      update: { value: true },
      create: { category: 'setup', key: 'step2_complete', value: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Setup step 2 error:', error)
    res.status(500).json({ error: 'Failed to save church profile' })
  }
})

// ============================================
// POST /api/setup/step3 - Branding
// ============================================
router.post('/step3', async (req: Request, res: Response) => {
  try {
    const parseResult = setupStep3Schema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Store branding settings
    const settings = [
      { category: 'branding', key: 'logo_url', value: data.logoUrl || '' },
      { category: 'branding', key: 'favicon_url', value: data.faviconUrl || '' },
      { category: 'branding', key: 'primary_color', value: data.primaryColor },
      { category: 'branding', key: 'tagline', value: data.tagline || '' },
    ]

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { category_key: { category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: setting,
      })
    }

    // Mark step 3 complete
    await prisma.setting.upsert({
      where: { category_key: { category: 'setup', key: 'step3_complete' } },
      update: { value: true },
      create: { category: 'setup', key: 'step3_complete', value: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Setup step 3 error:', error)
    res.status(500).json({ error: 'Failed to save branding' })
  }
})

// ============================================
// POST /api/setup/step4 - Email Setup
// ============================================
router.post('/step4', async (req: Request, res: Response) => {
  try {
    const parseResult = setupStep4Schema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // Store email settings
    const settings = [
      { category: 'email', key: 'provider', value: data.emailProvider },
      { category: 'email', key: 'smtp_host', value: data.smtpHost || '' },
      { category: 'email', key: 'smtp_port', value: data.smtpPort || 587 },
      { category: 'email', key: 'smtp_user', value: data.smtpUser || '' },
      { category: 'email', key: 'smtp_password', value: data.smtpPassword || '' },
      { category: 'email', key: 'sendgrid_api_key', value: data.sendgridApiKey || '' },
      { category: 'email', key: 'from_email', value: data.fromEmail || '' },
      { category: 'email', key: 'from_name', value: data.fromName || '' },
    ]

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { category_key: { category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: setting,
      })
    }

    // Mark step 4 complete
    await prisma.setting.upsert({
      where: { category_key: { category: 'setup', key: 'step4_complete' } },
      update: { value: true },
      create: { category: 'setup', key: 'step4_complete', value: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Setup step 4 error:', error)
    res.status(500).json({ error: 'Failed to save email settings' })
  }
})

// ============================================
// POST /api/setup/complete - Finalize Setup
// ============================================
router.post('/complete', async (_req: Request, res: Response) => {
  try {
    // Mark setup as complete
    await prisma.setting.upsert({
      where: { category_key: { category: 'system', key: 'setup_complete' } },
      update: { value: true },
      create: { category: 'system', key: 'setup_complete', value: true },
    })

    await prisma.setting.upsert({
      where: { category_key: { category: 'system', key: 'setup_completed_at' } },
      update: { value: new Date().toISOString() },
      create: { category: 'system', key: 'setup_completed_at', value: new Date().toISOString() },
    })

    // Log setup completion
    await prisma.auditLog.create({
      data: {
        action: 'SETUP_COMPLETE',
        entityType: 'System',
        metadata: { completedAt: new Date().toISOString() },
      },
    })

    res.json({ success: true, message: 'Setup completed successfully!' })
  } catch (error) {
    console.error('Setup complete error:', error)
    res.status(500).json({ error: 'Failed to complete setup' })
  }
})

// ============================================
// GET /api/setup/summary - Get setup summary for review
// ============================================
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        category: {
          in: ['church', 'branding', 'email'],
        },
      },
    })

    const summary: Record<string, Record<string, unknown>> = {}
    for (const setting of settings) {
      if (!summary[setting.category]) {
        summary[setting.category] = {}
      }
      // Don't expose sensitive values
      if (setting.key === 'smtp_password' || setting.key === 'sendgrid_api_key') {
        summary[setting.category][setting.key] = setting.value ? '[CONFIGURED]' : '[NOT SET]'
      } else {
        summary[setting.category][setting.key] = setting.value
      }
    }

    res.json(summary)
  } catch (error) {
    console.error('Setup summary error:', error)
    res.status(500).json({ error: 'Failed to get setup summary' })
  }
})

export default router

