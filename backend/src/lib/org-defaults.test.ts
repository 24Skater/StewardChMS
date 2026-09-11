import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DEFAULT_MESSAGE_TEMPLATES, defaultSettings } from './org-defaults.js'
import { TENANTED_MODELS } from './tenancy.js'

const here = dirname(fileURLToPath(import.meta.url))
const seedSource = readFileSync(resolve(here, '../../prisma/seed.ts'), 'utf8')

/**
 * The rule this file exists to hold: the installation seed writes global rows,
 * and per-church rows are written when a church is created.
 *
 * It is enforced by reading the seed script rather than by running it, because
 * the failure being prevented is not subtle at runtime — it takes the whole
 * seed down — but it is very easy to reintroduce while writing a feature, and
 * the person who reintroduces it will not be running `prisma db seed` against
 * an empty database when they do.
 */
describe('the installation seed stays out of tenanted models', () => {
  it('touches no model that requires an organization', () => {
    // At seed time there is no organization, so a write to any of these fails
    // and takes the rest of the seed with it. That is exactly what happened to
    // `messageTemplate`: it gained an `orgId`, the seed kept creating templates
    // without one, and permissions were never assigned to the admin role
    // because the script died first.
    const offenders = [...TENANTED_MODELS].filter((model) =>
      new RegExp(`prisma\\.${model}\\b`, 'i').test(seedSource)
    )

    expect(offenders, `prisma/seed.ts writes tenanted models: ${offenders.join(', ')}`).toEqual([])
  })

  it('still seeds the global RBAC catalogue', () => {
    // The counterpart assertion. Moving per-church rows out must not turn into
    // moving everything out: permissions and roles are installation-wide and
    // have to stay.
    expect(seedSource).toMatch(/prisma\.permission\./)
    expect(seedSource).toMatch(/prisma\.role\./)
    expect(seedSource).toMatch(/prisma\.rolePermission\./)
  })
})

describe('what a new church starts with', () => {
  it('names the church in every place a first page reads from', () => {
    const settings = defaultSettings('Grace Fellowship')
    const values = settings.map((setting) => setting.value)

    expect(values).toContain('Grace Fellowship')
    expect(settings.map((setting) => `${setting.category}.${setting.key}`)).toEqual([
      'branding.church_name',
      'church.name',
      'system.setup_complete',
    ])
  })

  it('starts every church with the scheduling notifications', () => {
    // A church with no templates has a scheduling feature that silently sends
    // nothing, which is worse than one that refuses to send.
    expect(DEFAULT_MESSAGE_TEMPLATES.map((template) => template.name)).toEqual([
      'schedule.assigned',
      'schedule.reminder',
    ])

    for (const template of DEFAULT_MESSAGE_TEMPLATES) {
      expect(template.body.length).toBeGreaterThan(0)
      expect(template.channel).toBe('email')
    }
  })
})
