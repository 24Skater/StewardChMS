/**
 * Every hostname this app knows about, derived from one environment variable.
 *
 * The platform root domain is configuration and never a source constant. It has
 * changed once already, while the product was being named, and the only reason
 * that was a one-line change rather than a search-and-replace across five repos
 * is that nothing hardcodes it. `scripts/ci/check-platform-boundaries.sh` keeps
 * it that way.
 */

/** The label this application answers to under the tenant root. */
export const APP_LABEL = 'stewardchms'

/**
 * The platform root domain, or null when this is a self-hosted install.
 *
 * Null is not an error. A church running its own copy has one organization on
 * one hostname of its own choosing, and asking it to invent a platform domain
 * would be asking it to pretend to be the platform.
 */
export function rootDomain(): string | null {
  const value = process.env.PLATFORM_ROOT_DOMAIN?.trim()
  return value ? value : null
}

/** Where a given church's Congregation lives, e.g. `grace-stewardchms.app.example.org`. */
export function tenantHost(slug: string): string | null {
  const root = rootDomain()
  return root ? `${slug}-${APP_LABEL}.app.${root}` : null
}

/** The full https URL for a church's Congregation. */
export function tenantUrl(slug: string): string | null {
  const host = tenantHost(slug)
  return host ? `https://${host}` : null
}

/**
 * The organization slug in a Host header, or null.
 *
 * Ports are stripped, case is ignored, and anything that is not exactly
 * `{slug}-{APP_LABEL}.app.{root}` returns null — including a host for a
 * different Steward application, which must not resolve here.
 */
export function extractTenantSlug(host: string | undefined): string | null {
  const root = rootDomain()
  if (!host || !root) return null

  const hostname = host.split(':')[0].trim().toLowerCase()
  const suffix = `.app.${root.toLowerCase()}`
  if (!hostname.endsWith(suffix)) return null

  const label = hostname.slice(0, -suffix.length)
  const marker = `-${APP_LABEL}`
  if (!label.endsWith(marker)) return null

  const slug = label.slice(0, -marker.length)
  // A slug is what the console allows: lowercase letters, digits and hyphens,
  // not empty, and not leading or trailing a hyphen.
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) ? slug : null
}

/**
 * Whether an Origin may call this API.
 *
 * Self-hosted installs keep the single `CORS_ORIGIN` they always had. On the
 * platform, each church's browser origin is its own tenant host, so the set is
 * open-ended and has to be matched by shape rather than listed.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false

  const configured = process.env.CORS_ORIGIN || 'http://localhost:5173'
  if (configured.split(',').some((entry) => entry.trim() === origin)) return true

  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false
    return extractTenantSlug(url.host) !== null
  } catch {
    return false
  }
}
