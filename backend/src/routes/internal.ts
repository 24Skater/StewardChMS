import { Request, Response, Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireOrgId, runInOrg, withoutOrgScope } from '../lib/org-context.js'
import { clearOrgCache } from '../middleware/org.js'
import { isPlatformRequest } from '../lib/service-token.js'

/**
 * POST /api/internal/provision
 *
 * Called by the Steward console when a church signs up for Congregation. It
 * creates this app's tenant root and nothing else — the console owns identity,
 * billing and entitlements, and this app owns its own schema.
 *
 * Two properties the console depends on:
 *
 * 1. **`Org.id` is the console's `orgId`.** Not a mapping table, not a foreign
 *    key — the same value. One church has one id across all four Steward apps,
 *    forever, and the console mints it.
 * 2. **Idempotent by `orgId`.** The console retries with backoff, so a second
 *    call for an organization that already exists must succeed and change
 *    nothing. That is what makes retrying safe rather than merely tolerable.
 *
 * There is no DNS or certificate work here. The wildcard record and wildcard
 * certificate already resolve `{slug}-stewardchms.app.<root>`.
 */

const router = Router()

const provisionSchema = z.object({
  orgId: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .max(31)
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value), {
      message: 'A slug is lowercase letters, digits and hyphens.',
    }),
  organizationName: z.string().min(1).max(200),
  ownerEmail: z.string().email().optional(),
})

/**
 * The settings a church needs before its first page renders.
 *
 * Written at provisioning rather than lazily, so no settings screen has to cope
 * with a missing row on first load.
 */
function defaultSettings(organizationName: string): { category: string; key: string; value: unknown }[] {
  return [
    { category: 'branding', key: 'church_name', value: organizationName },
    { category: 'church', key: 'name', value: organizationName },
    { category: 'system', key: 'setup_complete', value: true },
  ]
}

/**
 * Gives the owner an administrator's roles in their own church.
 *
 * The user row itself is global and may already exist — one person can serve
 * two churches with one login. What is created here is the church-shaped half:
 * a membership and a role grant, both scoped to this organization.
 *
 * No password is set. The owner arrives through the existing password-reset
 * flow, which is the same path a forgotten password takes and so is already
 * tested, rate-limited and audited.
 */
async function grantOwner(orgId: string, email: string): Promise<void> {
  const user = await withoutOrgScope(() =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: '',
        isActive: true,
        isPrimaryAdmin: false,
        isSeedAccount: false,
      },
      select: { id: true },
    })
  )

  const adminRole = await withoutOrgScope(() =>
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'System Administrator with full access' },
      select: { id: true },
    })
  )

  await runInOrg({ orgId, slug: '' }, async () => {
    await prisma.membership.upsert({
      where: { orgId_userId: { orgId, userId: user.id } },
      update: { isOwner: true },
      create: { orgId: requireOrgId(), userId: user.id, isOwner: true },
    })

    await prisma.userRole.upsert({
      where: { orgId_userId_roleId: { orgId, userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { orgId: requireOrgId(), userId: user.id, roleId: adminRole.id },
    })
  })
}

router.post('/provision', async (req: Request, res: Response) => {
  if (!isPlatformRequest(req.headers.authorization)) {
    res.status(401).json({ state: 'failed', error: 'unauthorized' })
    return
  }

  const parsed = provisionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      state: 'failed',
      error: 'invalid_request',
      detail: parsed.error.issues[0]?.message,
    })
    return
  }

  const { orgId, slug, organizationName, ownerEmail } = parsed.data

  try {
    // Org is a global model — this is the call that brings the tenant into
    // existence, so there is nothing to scope it to yet.
    const existing = await withoutOrgScope(() =>
      prisma.org.findUnique({ where: { id: orgId }, select: { id: true } })
    )

    if (existing) {
      // Already provisioned. Report ready without touching anything: the
      // console may be retrying after a response it never received, and a
      // retry must not rename a church that has since renamed itself.
      if (ownerEmail) await grantOwner(orgId, ownerEmail)
      res.json({ state: 'ready', orgId: existing.id, created: false })
      return
    }

    const slugOwner = await withoutOrgScope(() =>
      prisma.org.findUnique({ where: { slug }, select: { id: true } })
    )

    if (slugOwner) {
      // 409, not 500: a permanent condition the console must not retry into.
      // Its classifier fails fast on any 4xx other than 429, so the collision
      // reaches an operator instead of burning the retry budget.
      res.status(409).json({
        state: 'failed',
        error: 'slug_taken',
        detail: `The slug "${slug}" is already in use.`,
      })
      return
    }

    await withoutOrgScope(() =>
      prisma.org.create({ data: { id: orgId, slug, name: organizationName } })
    )

    await runInOrg({ orgId, slug }, async () => {
      for (const setting of defaultSettings(organizationName)) {
        await prisma.setting.create({
          data: { orgId: requireOrgId(), category: setting.category, key: setting.key, value: setting.value as never },
        })
      }
    })

    if (ownerEmail) await grantOwner(orgId, ownerEmail)

    // The middleware caches slug lookups for a minute. A church that has just
    // been created should not have to wait out a negative cache entry.
    clearOrgCache()

    res.status(201).json({ state: 'ready', orgId, created: true })
  } catch (error) {
    console.error('Provisioning error:', error)
    res.status(500).json({ state: 'failed', error: 'internal_error' })
  }
})

export default router
