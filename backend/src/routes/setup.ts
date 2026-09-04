import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import prisma from '../lib/prisma.js'
import { OrgContext, requireOrgId, runInOrg, withoutOrgScope } from '../lib/org-context.js'
import { hashPassword, signToken, COOKIE_OPTIONS, COOKIE_NAME } from '../lib/auth.js'
import { validatePassword, generateSecureToken } from '../lib/security.js'
import { createAuditLog } from '../lib/audit.js'
import { requireAuth, requirePrimaryAdmin } from '../middleware/auth.js'

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
  fromEmail: z.string().email().optional().or(z.literal('')),
  fromName: z.string().optional(),
})

// ============================================
// GET /api/setup/status
// Check if setup is needed
// ============================================
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Check if a primary admin exists
    const primaryAdmin = await prisma.user.findFirst({
      where: { isPrimaryAdmin: true },
    })

    // Check non-seed user count
    const nonSeedUserCount = await prisma.user.count({
      where: { isSeedAccount: false },
    })

    // Before step 1 there is no organization at all, so there is nowhere for a
    // settings row to live. That state is exactly "needs setup" — asking the
    // database about it would only produce a tenancy error saying the same
    // thing less clearly.
    const setupComplete = req.org
      ? await prisma.setting.findUnique({
          where: {
            org_category_key: { orgId: req.org.orgId, category: 'system', key: 'setup_complete' },
          },
        })
      : null

    res.json({
      needsSetup: !primaryAdmin || !setupComplete,
      hasPrimaryAdmin: !!primaryAdmin,
      hasUsers: nonSeedUserCount > 0,
      isComplete: !!setupComplete?.value,
    })
  } catch (error) {
    console.error('Setup status error:', error)
    res.status(500).json({ error: 'Failed to check setup status' })
  }
})

// Schema for enabling seed account
const enableSeedAccountSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
})

// ============================================
// POST /api/setup/step1 - Create Admin Account
// ============================================
router.post('/step1', async (req: Request, res: Response) => {
  try {
    // Check if a primary admin already exists
    const existingPrimaryAdmin = await prisma.user.findFirst({
      where: { isPrimaryAdmin: true },
    })
    if (existingPrimaryAdmin) {
      res.status(400).json({ error: 'Setup has already been completed. Primary admin exists.' })
      return
    }

    // Also check for non-seed users (backward compatibility)
    const nonSeedUserCount = await prisma.user.count({
      where: { isSeedAccount: false },
    })
    if (nonSeedUserCount > 0) {
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

    // The organization has to exist before anything that belongs to it does.
    //
    // On the platform this step never runs — the console provisions the
    // organization through POST /api/internal/provision and invites the owner.
    // This is the self-hosted path: one church, one organization, created here
    // because there is no console to create it.
    const org: OrgContext =
      req.org ??
      (await withoutOrgScope(async () => {
        const created = await prisma.org.create({
          data: { id: randomUUID(), slug: 'default', name: name || 'Steward Congregation' },
          select: { id: true, slug: true },
        })
        return { orgId: created.id, slug: created.slug }
      }))

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

    // Create admin user as PRIMARY ADMIN.
    //
    // The user row is global — one person, one login — so it is created outside
    // any organization. Their membership and their role grant are not: both
    // belong to the church created above, and are written inside it so the
    // guard stamps them rather than the caller having to remember to.
    const passwordHash = await hashPassword(password)
    const user = await withoutOrgScope(() =>
      prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          isActive: true,
          isPrimaryAdmin: true, // This is the primary admin - highest authority
          isSeedAccount: false,
        },
      })
    )

    const userRoles = await runInOrg(org, async () => {
      await prisma.membership.create({ data: { orgId: requireOrgId(), userId: user.id, isOwner: true } })
      await prisma.userRole.create({ data: { orgId: requireOrgId(), userId: user.id, roleId: adminRole.id } })

      return prisma.userRole.findMany({
        where: { userId: user.id },
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
      })
    })

    // Ensure seed account is disabled (if it exists)
    await prisma.user.updateMany({
      where: { isSeedAccount: true },
      data: { isActive: false },
    })

    // Generate JWT secret and store it
    const jwtSecret = generateSecureToken(64)
    await prisma.setting.upsert({
      where: { org_category_key: { orgId: org.orgId, category: 'security', key: 'jwt_secret' } },
      update: { value: jwtSecret, updatedBy: user.id },
      create: { orgId: requireOrgId(), category: 'security', key: 'jwt_secret', value: jwtSecret, updatedBy: user.id },
    })

    // Mark step 1 complete
    await prisma.setting.upsert({
      where: { org_category_key: { orgId: org.orgId, category: 'setup', key: 'step1_complete' } },
      update: { value: true, updatedBy: user.id },
      create: { orgId: requireOrgId(), category: 'setup', key: 'step1_complete', value: true, updatedBy: user.id },
    })

    // Generate token for the new user
    const roles: string[] = userRoles.map((ur: { role: { name: string } }) => ur.role.name)
    const permKeys = userRoles.flatMap((ur: { role: { rolePermissions: Array<{ permission: { key: string } }> } }) =>
      ur.role.rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)
    )
    const userPermissions: string[] = Array.from(new Set(permKeys))

    const { accessToken, expiresAt } = signToken({
      userId: user.id,
      email: user.email,
      orgId: org.orgId,
      roles,
      permissions: userPermissions,
      isPrimaryAdmin: user.isPrimaryAdmin,
    })

    // Set cookie
    res.cookie(COOKIE_NAME, accessToken, COOKIE_OPTIONS)

    // Log setup
    await createAuditLog({
      actorUserId: user.id,
      action: 'SETUP_STEP1_COMPLETE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email },
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
        isPrimaryAdmin: user.isPrimaryAdmin,
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
    const orgId = requireOrgId()

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
        where: { org_category_key: { orgId: requireOrgId(), category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: { ...setting, orgId: requireOrgId() },
      })
    }

    // The organization's own name follows the church's. Step 1 had only the
    // administrator's name to go on, and an organization called "Pastor Dave"
    // is what the console would show on every invoice.
    await withoutOrgScope(() =>
      prisma.org.update({ where: { id: orgId }, data: { name: data.churchName } })
    )

    // Mark step 2 complete
    await prisma.setting.upsert({
      where: { org_category_key: { orgId: requireOrgId(), category: 'setup', key: 'step2_complete' } },
      update: { value: true },
      create: { orgId: requireOrgId(), category: 'setup', key: 'step2_complete', value: true },
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
        where: { org_category_key: { orgId: requireOrgId(), category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: { ...setting, orgId: requireOrgId() },
      })
    }

    // Mark step 3 complete
    await prisma.setting.upsert({
      where: { org_category_key: { orgId: requireOrgId(), category: 'setup', key: 'step3_complete' } },
      update: { value: true },
      create: { orgId: requireOrgId(), category: 'setup', key: 'step3_complete', value: true },
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
        where: { org_category_key: { orgId: requireOrgId(), category: setting.category, key: setting.key } },
        update: { value: setting.value },
        create: { ...setting, orgId: requireOrgId() },
      })
    }

    // Mark step 4 complete
    await prisma.setting.upsert({
      where: { org_category_key: { orgId: requireOrgId(), category: 'setup', key: 'step4_complete' } },
      update: { value: true },
      create: { orgId: requireOrgId(), category: 'setup', key: 'step4_complete', value: true },
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
      where: { org_category_key: { orgId: requireOrgId(), category: 'system', key: 'setup_complete' } },
      update: { value: true },
      create: { orgId: requireOrgId(), category: 'system', key: 'setup_complete', value: true },
    })

    await prisma.setting.upsert({
      where: { org_category_key: { orgId: requireOrgId(), category: 'system', key: 'setup_completed_at' } },
      update: { value: new Date().toISOString() },
      create: { orgId: requireOrgId(), category: 'system', key: 'setup_completed_at', value: new Date().toISOString() },
    })

    // Log setup completion
    await createAuditLog({
      action: 'SETUP_COMPLETE',
      entityType: 'System',
      metadata: { completedAt: new Date().toISOString() },
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

// ============================================
// SEED ACCOUNT MANAGEMENT (Primary Admin Only)
// ============================================

// ============================================
// GET /api/setup/seed-account/status
// Check seed account status (Primary Admin only)
// ============================================
router.get('/seed-account/status', requireAuth, requirePrimaryAdmin(), async (_req: Request, res: Response) => {
  try {
    const seedAccount = await prisma.user.findFirst({
      where: { isSeedAccount: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!seedAccount) {
      res.json({
        exists: false,
        message: 'No seed account exists. Run the seed script to create one.',
      })
      return
    }

    res.json({
      exists: true,
      id: seedAccount.id,
      email: seedAccount.email,
      name: seedAccount.name,
      isActive: seedAccount.isActive,
      createdAt: seedAccount.createdAt.toISOString(),
      updatedAt: seedAccount.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Get seed account status error:', error)
    res.status(500).json({ error: 'Failed to get seed account status' })
  }
})

// ============================================
// POST /api/setup/seed-account/enable
// Enable seed account with new password (Primary Admin only)
// ============================================
router.post('/seed-account/enable', requireAuth, requirePrimaryAdmin(), async (req: Request, res: Response) => {
  try {
    const parseResult = enableSeedAccountSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { password } = parseResult.data

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      })
      return
    }

    // Find seed account
    const seedAccount = await prisma.user.findFirst({
      where: { isSeedAccount: true },
    })

    if (!seedAccount) {
      res.status(404).json({ error: 'Seed account not found. Run the seed script to create one.' })
      return
    }

    if (seedAccount.isActive) {
      res.status(400).json({ error: 'Seed account is already active' })
      return
    }

    // Update seed account with new password and enable it
    const passwordHash = await hashPassword(password)
    await prisma.user.update({
      where: { id: seedAccount.id },
      data: {
        passwordHash,
        isActive: true,
      },
    })

    // Log the action
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'SEED_ACCOUNT_ENABLED',
      entityType: 'User',
      entityId: seedAccount.id,
      metadata: {
        enabledBy: req.user!.email,
        timestamp: new Date().toISOString(),
      },
    })

    res.json({
      success: true,
      message: 'Seed account has been enabled. Use the email and new password to log in.',
      email: seedAccount.email,
    })
  } catch (error) {
    console.error('Enable seed account error:', error)
    res.status(500).json({ error: 'Failed to enable seed account' })
  }
})

// ============================================
// POST /api/setup/seed-account/disable
// Disable seed account (Primary Admin only)
// ============================================
router.post('/seed-account/disable', requireAuth, requirePrimaryAdmin(), async (req: Request, res: Response) => {
  try {
    // Find seed account
    const seedAccount = await prisma.user.findFirst({
      where: { isSeedAccount: true },
    })

    if (!seedAccount) {
      res.status(404).json({ error: 'Seed account not found' })
      return
    }

    if (!seedAccount.isActive) {
      res.status(400).json({ error: 'Seed account is already disabled' })
      return
    }

    // Disable the seed account
    await prisma.user.update({
      where: { id: seedAccount.id },
      data: {
        isActive: false,
      },
    })

    // Log the action
    await createAuditLog({
      actorUserId: req.user!.userId,
      action: 'SEED_ACCOUNT_DISABLED',
      entityType: 'User',
      entityId: seedAccount.id,
      metadata: {
        disabledBy: req.user!.email,
        timestamp: new Date().toISOString(),
      },
    })

    res.json({
      success: true,
      message: 'Seed account has been disabled',
    })
  } catch (error) {
    console.error('Disable seed account error:', error)
    res.status(500).json({ error: 'Failed to disable seed account' })
  }
})

export default router

