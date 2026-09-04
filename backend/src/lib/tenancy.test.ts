import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { GLOBAL_MODELS, PARENT_SCOPED_MODELS, TENANTED_MODELS } from './tenancy.js'

/**
 * The classification is only as good as its coverage.
 *
 * A model added next year is a model nobody remembers to classify, and an
 * unclassified model would otherwise be an unguarded one. So the schema itself
 * is the test's input: Prisma's DMMF lists every model and every field, and the
 * assertions below are about agreement between the schema and the three sets.
 */

const models = Prisma.dmmf.datamodel.models

const named = (name: string) => name.toLowerCase()

const hasOrgId = (name: string): boolean => {
  const model = models.find((m) => m.name === name)
  return model?.fields.some((f) => f.name === 'orgId') ?? false
}

describe('model classification', () => {
  it('classifies every model in the schema exactly once', () => {
    const unclassified: string[] = []
    const duplicated: string[] = []

    for (const model of models) {
      const key = named(model.name)
      const memberships = [
        TENANTED_MODELS.has(key),
        PARENT_SCOPED_MODELS.has(key),
        GLOBAL_MODELS.has(key),
      ].filter(Boolean).length

      if (memberships === 0) unclassified.push(model.name)
      if (memberships > 1) duplicated.push(model.name)
    }

    expect(unclassified).toEqual([])
    expect(duplicated).toEqual([])
  })

  it('names no model the schema does not have', () => {
    const real = new Set(models.map((m) => named(m.name)))
    const invented = [...TENANTED_MODELS, ...PARENT_SCOPED_MODELS, ...GLOBAL_MODELS].filter(
      (name) => !real.has(name)
    )

    // A stale entry is worse than a missing one: it looks like coverage and is
    // not, and the coverage test above would still pass.
    expect(invented).toEqual([])
  })

  it('gives every tenanted model an orgId to be scoped by', () => {
    const withoutColumn = models
      .filter((m) => TENANTED_MODELS.has(named(m.name)))
      .filter((m) => !hasOrgId(m.name))
      .map((m) => m.name)

    // The guard writes `where.orgId` on these. A model listed here without the
    // column would throw on every query rather than being protected by one.
    expect(withoutColumn).toEqual([])
  })

  it('gives no unguarded model an orgId nobody enforces', () => {
    const misfiled = models
      .filter((m) => !TENANTED_MODELS.has(named(m.name)))
      .filter((m) => hasOrgId(m.name))
      .map((m) => m.name)

    // An `orgId` the guard ignores is the worst of both: it looks scoped in the
    // schema and is scoped by nothing at runtime.
    expect(misfiled).toEqual([])
  })

  it('scopes every uniqueness rule on a tenanted model to the organization', () => {
    // Two churches may both have a fund called General, a member with the same
    // email address, and an invoice numbered 1. A unique index that predates
    // tenancy would make the second church's row impossible to create — and the
    // failure would arrive as a database error during their first Sunday.
    //
    // Three uniques are deliberately global, and each for a reason that scoping
    // would break rather than improve:
    //
    // - `WorshipPlan.eventOccurrenceId` and `SlotAssignment.slotId` are
    //   one-to-one with a parent that is itself scoped. The parent cannot be in
    //   two organizations, so neither can the child, and adding `orgId` to the
    //   key would permit a second plan for the same service.
    // - `MinistryCalendar.shareToken` is an unguessable public token, handed to
    //   people who have no session and no organization. Being unique across the
    //   installation is the whole mechanism.
    const DELIBERATELY_GLOBAL = new Set([
      'WorshipPlan.eventOccurrenceId',
      'SlotAssignment.slotId',
      'MinistryCalendar.shareToken',
    ])

    const globallyUnique: string[] = []

    for (const model of models) {
      if (!TENANTED_MODELS.has(named(model.name))) continue

      for (const field of model.fields) {
        const qualified = `${model.name}.${field.name}`
        if (!field.isUnique) continue
        // Stripe's identifiers are unique across every account on earth, so
        // scoping them to an organization would be pretending otherwise.
        if (field.name.startsWith('stripe')) continue
        if (DELIBERATELY_GLOBAL.has(qualified)) continue
        globallyUnique.push(qualified)
      }
    }

    expect(globallyUnique).toEqual([])
  })
})
