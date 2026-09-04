import { describe, it, expect, afterEach } from 'vitest'
import { extractTenantSlug, isAllowedOrigin, rootDomain, tenantHost } from './platform-domain.js'

const ROOT = 'PLATFORM_ROOT_DOMAIN'
const CORS = 'CORS_ORIGIN'

afterEach(() => {
  delete process.env[ROOT]
  delete process.env[CORS]
})

describe('the platform root domain', () => {
  it('is absent for a self-hosted install', () => {
    expect(rootDomain()).toBeNull()
    expect(tenantHost('grace')).toBeNull()
  })

  it('treats an empty value as absent rather than as an empty domain', () => {
    // A blank environment variable is how a self-hosted install usually says
    // "not on the platform". Reading it as a root domain would build hosts like
    // `grace-stewardchms.app.` and then fail to match any of them.
    process.env[ROOT] = '   '
    expect(rootDomain()).toBeNull()
  })
})

describe('reading the organization out of a host', () => {
  it('finds the slug on this application host', () => {
    process.env[ROOT] = 'example.org'
    expect(extractTenantSlug('grace-stewardchms.app.example.org')).toBe('grace')
  })

  it('ignores the port and the case', () => {
    process.env[ROOT] = 'example.org'
    expect(extractTenantSlug('Grace-StewardChMS.app.Example.org:8443')).toBe('grace')
  })

  it('refuses another Steward application on the same root', () => {
    process.env[ROOT] = 'example.org'
    // A Table host resolving here would give a church's Table subscription
    // access to their Congregation data, which is a different purchase.
    expect(extractTenantSlug('grace-stewardtable.app.example.org')).toBeNull()
  })

  it('refuses a host on a different root domain', () => {
    process.env[ROOT] = 'example.org'
    expect(extractTenantSlug('grace-stewardchms.app.attacker.test')).toBeNull()
    // ...including one that merely ends with the root's characters.
    expect(extractTenantSlug('grace-stewardchms.app.notexample.org')).toBeNull()
  })

  it('refuses a slug that is empty or malformed', () => {
    process.env[ROOT] = 'example.org'
    expect(extractTenantSlug('-stewardchms.app.example.org')).toBeNull()
    expect(extractTenantSlug('stewardchms.app.example.org')).toBeNull()
    expect(extractTenantSlug('Grace_Church-stewardchms.app.example.org')).toBeNull()
  })

  it('resolves nothing when no root domain is configured', () => {
    expect(extractTenantSlug('grace-stewardchms.app.example.org')).toBeNull()
  })
})

describe('deciding which origins may call the API', () => {
  it('allows the configured origin of a self-hosted install', () => {
    process.env[CORS] = 'https://chms.mychurch.test'
    expect(isAllowedOrigin('https://chms.mychurch.test')).toBe(true)
    expect(isAllowedOrigin('https://elsewhere.test')).toBe(false)
  })

  it('allows any tenant host under the platform root', () => {
    process.env[ROOT] = 'example.org'
    expect(isAllowedOrigin('https://grace-stewardchms.app.example.org')).toBe(true)
    expect(isAllowedOrigin('https://hope-stewardchms.app.example.org')).toBe(true)
  })

  it('requires https for a tenant host', () => {
    process.env[ROOT] = 'example.org'
    // The platform terminates TLS at the edge and every tenant host is https.
    // An http origin claiming to be one is not one.
    expect(isAllowedOrigin('http://grace-stewardchms.app.example.org')).toBe(false)
  })

  it('refuses a sibling application and anything unparseable', () => {
    process.env[ROOT] = 'example.org'
    expect(isAllowedOrigin('https://grace-stewardtable.app.example.org')).toBe(false)
    expect(isAllowedOrigin('not a url')).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
  })
})
