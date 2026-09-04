import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId } from '../lib/org-context.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// All settings routes require admin.access permission
router.use(requireAuth)
router.use(requirePermission('admin.access'))

// ============================================
// Schemas
// ============================================

const updateSettingSchema = z.object({
  value: z.unknown(),
})

const updateMultipleSettingsSchema = z.object({
  settings: z.array(z.object({
    category: z.string(),
    key: z.string(),
    value: z.unknown(),
  })),
})

// ============================================
// GET /api/settings
// Get all settings grouped by category
// ============================================
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, Record<string, unknown>> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {}
      }
      
      // Mask sensitive values
      const sensitiveKeys = ['smtp_password', 'sendgrid_api_key', 'jwt_secret']
      if (sensitiveKeys.includes(setting.key)) {
        grouped[setting.category][setting.key] = setting.value ? '[CONFIGURED]' : null
      } else {
        grouped[setting.category][setting.key] = setting.value
      }
    }

    res.json(grouped)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

// ============================================
// GET /api/settings/:category
// Get settings for a specific category
// ============================================
router.get('/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params

    const settings = await prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    })

    const result: Record<string, unknown> = {}
    const sensitiveKeys = ['smtp_password', 'sendgrid_api_key', 'jwt_secret']
    
    for (const setting of settings) {
      if (sensitiveKeys.includes(setting.key)) {
        result[setting.key] = setting.value ? '[CONFIGURED]' : null
      } else {
        result[setting.key] = setting.value
      }
    }

    res.json(result)
  } catch (error) {
    console.error('Get settings category error:', error)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

// ============================================
// PUT /api/settings/:category/:key
// Update a single setting
// ============================================
router.put('/:category/:key', async (req: Request, res: Response) => {
  try {
    const { category, key } = req.params
    
    const parseResult = updateSettingSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { value } = parseResult.data

    const setting = await prisma.setting.upsert({
      where: { org_category_key: { orgId: requireOrgId(), category, key } },
      update: { 
        value: value as object,
        updatedBy: req.user?.userId,
      },
      create: { 
        orgId: requireOrgId(),
        category, 
        key, 
        value: value as object,
        updatedBy: req.user?.userId,
      },
    })

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SETTING_UPDATED',
      entityType: 'Setting',
      entityId: setting.id,
      metadata: { category, key },
    })

    res.json(setting)
  } catch (error) {
    console.error('Update setting error:', error)
    res.status(500).json({ error: 'Failed to update setting' })
  }
})

// ============================================
// PUT /api/settings
// Update multiple settings at once
// ============================================
router.put('/', async (req: Request, res: Response) => {
  try {
    const parseResult = updateMultipleSettingsSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const { settings } = parseResult.data

    const results = await Promise.all(
      settings.map((s) =>
        prisma.setting.upsert({
          where: { org_category_key: { orgId: requireOrgId(), category: s.category, key: s.key } },
          update: { 
            value: s.value as object,
            updatedBy: req.user?.userId,
          },
          create: { 
            orgId: requireOrgId(),
            category: s.category, 
            key: s.key, 
            value: s.value as object,
            updatedBy: req.user?.userId,
          },
        })
      )
    )

    // Audit log
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SETTINGS_BULK_UPDATED',
      entityType: 'Setting',
      metadata: { count: settings.length, categories: [...new Set(settings.map(s => s.category))] },
    })

    res.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Bulk update settings error:', error)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// ============================================
// GET /api/settings/public/branding
// Get public branding settings (no auth required)
// ============================================
// Note: This endpoint is mounted separately without auth middleware

export const publicSettingsRouter = Router()

publicSettingsRouter.get('/public/branding', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { category: 'branding' },
    })

    const result: Record<string, unknown> = {}
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    // Also get church name for header
    const churchName = await prisma.setting.findUnique({
      where: { org_category_key: { orgId: requireOrgId(), category: 'church', key: 'name' } },
    })
    if (churchName) {
      result['church_name'] = churchName.value
    }

    res.json(result)
  } catch (error) {
    console.error('Get public branding error:', error)
    res.status(500).json({ error: 'Failed to get branding' })
  }
})

export default router

