import { NextFunction, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { OrgContext, runInOrg, withoutOrgScope } from '../lib/org-context.js'
import { extractTenantSlug, rootDomain } from '../lib/platform-domain.js'

/**
 * Decides which church a request belongs to, and runs the rest of the request
 * inside that organization.
 *
 * The hostname decides — not a header, not a query parameter, not a claim in
 * the caller's own token. A browser can send any header it likes; it cannot
 * choose which host its request arrived on, because the certificate and the
 * router already settled that.
 *
 * The token is checked *against* the resolved organization later, in
 * `requireAuth`. That direction matters: the host says which church, and the
 * token has to agree.
 */

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  context: OrgContext | null
  expiresAt: number
}

const slugCache = new Map<string, CacheEntry>()

/** Forgets every cached slug. Exported for tests and for provisioning. */
export function clearOrgCache(): void {
  slugCache.clear()
}

async function orgForSlug(slug: string): Promise<OrgContext | null> {
  const cached = slugCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) return cached.context

  // Resolving which organization a host belongs to is the one lookup that
  // cannot itself be organization-scoped.
  const org = await withoutOrgScope(() =>
    prisma.org.findUnique({
      where: { slug },
      select: { id: true, slug: true, status: true },
    })
  )

  const context = org && org.status === 'active' ? { orgId: org.id, slug: org.slug } : null
  slugCache.set(slug, { context, expiresAt: Date.now() + CACHE_TTL_MS })
  return context
}

/**
 * The single organization of a self-hosted install.
 *
 * Returns null when there is none yet — a fresh install before setup has run —
 * or when there is more than one, which on a self-hosted box means something
 * has gone wrong and guessing would be worse than failing.
 */
async function soleOrg(): Promise<OrgContext | null> {
  const orgs = await withoutOrgScope(() =>
    prisma.org.findMany({ select: { id: true, slug: true }, take: 2 })
  )
  return orgs.length === 1 ? { orgId: orgs[0].id, slug: orgs[0].slug } : null
}

export async function resolveOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const context = rootDomain()
      ? await (async () => {
          const slug = extractTenantSlug(req.headers.host)
          return slug ? await orgForSlug(slug) : null
        })()
      : await soleOrg()

    if (!context) {
      // With a platform root configured, an unresolvable host is a request for
      // a church that does not exist here — 404 rather than 500, and without
      // saying whether the slug is free, which is the console's business.
      if (rootDomain()) {
        res.status(404).json({ error: 'Unknown organization' })
        return
      }
      // Self-hosted and not set up yet: let it through unscoped so /api/setup
      // and /api/health still answer. Every tenanted query still throws.
      next()
      return
    }

    req.org = context
    runInOrg(context, next)
  } catch (error) {
    console.error('Organization resolution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Runs a handler inside an organization that was established some other way —
 * the provisioning endpoint, which is told its organization by the console
 * rather than by a hostname.
 */
export function runForOrg<T>(context: OrgContext, fn: () => T): T {
  return runInOrg(context, fn)
}
