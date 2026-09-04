import { describe, it, expect } from 'vitest'
import { applyOrgScope } from './tenancy.js'

const ORG = 'org-1'
const OTHER = 'org-2'

describe('scoping a read', () => {
  it('adds the organization to a query that did not mention one', () => {
    const args: Record<string, unknown> = { where: { lastName: 'Okonkwo' } }
    applyOrgScope('Member', 'findMany', args, ORG)
    expect(args.where).toEqual({ lastName: 'Okonkwo', orgId: ORG })
  })

  it('adds it to a query with no where clause at all', () => {
    // `findMany()` with no arguments is the shape that leaks every church's
    // rows if nothing intervenes, so it is the one that matters most.
    const args: Record<string, unknown> = {}
    applyOrgScope('Member', 'findMany', args, ORG)
    expect(args.where).toEqual({ orgId: ORG })
  })

  it('adds it to a lookup by primary key', () => {
    // An id is unguessable but not unguessable enough to be an access control.
    const args: Record<string, unknown> = { where: { id: 'member-1' } }
    applyOrgScope('Member', 'findUnique', args, ORG)
    expect(args.where).toEqual({ id: 'member-1', orgId: ORG })
  })

  it('scopes counts and aggregates too', () => {
    for (const operation of ['count', 'aggregate', 'groupBy']) {
      const args: Record<string, unknown> = {}
      applyOrgScope('Donation', operation, args, ORG)
      expect(args.where).toEqual({ orgId: ORG })
    }
  })
})

describe('scoping a write', () => {
  it('stamps a created row with the organization', () => {
    const args: Record<string, unknown> = { data: { firstName: 'Ada' } }
    applyOrgScope('Member', 'create', args, ORG)
    expect(args.data).toEqual({ firstName: 'Ada', orgId: ORG })
  })

  it('stamps every row of a createMany', () => {
    const args: Record<string, unknown> = { data: [{ firstName: 'Ada' }, { firstName: 'Bem' }] }
    applyOrgScope('Member', 'createMany', args, ORG)
    expect(args.data).toEqual([
      { firstName: 'Ada', orgId: ORG },
      { firstName: 'Bem', orgId: ORG },
    ])
  })

  it('scopes both halves of an upsert', () => {
    const args: Record<string, unknown> = {
      where: { id: 'member-1' },
      create: { firstName: 'Ada' },
      update: { firstName: 'Ada' },
    }
    applyOrgScope('Member', 'upsert', args, ORG)
    expect(args.where).toEqual({ id: 'member-1', orgId: ORG })
    expect(args.create).toEqual({ firstName: 'Ada', orgId: ORG })
  })

  it('narrows an update and a delete to the organization', () => {
    for (const operation of ['update', 'delete', 'updateMany', 'deleteMany']) {
      const args: Record<string, unknown> = { where: { id: 'member-1' } }
      applyOrgScope('Member', operation, args, ORG)
      expect(args.where).toEqual({ id: 'member-1', orgId: ORG })
    }
  })

  it('refuses to write a row into another organization', () => {
    // The only way this happens is a caller passing an orgId it got from
    // somewhere else. Silently overwriting it would hide the bug; refusing
    // names it.
    const args: Record<string, unknown> = { data: { firstName: 'Ada', orgId: OTHER } }
    expect(() => applyOrgScope('Member', 'create', args, ORG)).toThrow(/another organization/)
  })

  it('accepts a row that names the organization it is already in', () => {
    const args: Record<string, unknown> = { data: { firstName: 'Ada', orgId: ORG } }
    expect(() => applyOrgScope('Member', 'create', args, ORG)).not.toThrow()
  })
})

describe('running with no organization', () => {
  it('throws rather than returning every church rows', () => {
    expect(() => applyOrgScope('Member', 'findMany', {}, null)).toThrow(/no organization in context/)
  })

  it('names the model and the operation, so the fix is obvious', () => {
    expect(() => applyOrgScope('Donation', 'create', { data: {} }, null)).toThrow(
      /create on Donation/
    )
  })

  it('lets global models through', () => {
    // A user signing in has not chosen a church yet; the role grants that say
    // which churches they may enter are tenanted, and the user row is not.
    const args: Record<string, unknown> = { where: { email: 'ada@example.test' } }
    expect(() => applyOrgScope('User', 'findUnique', args, null)).not.toThrow()
    expect(args.where).toEqual({ email: 'ada@example.test' })
  })

  it('lets line items through untouched', () => {
    // An invoice's items are as private as the invoice. There is no column to
    // check, and pretending otherwise would throw on every query.
    const args: Record<string, unknown> = { where: { invoiceId: 'invoice-1' } }
    expect(() => applyOrgScope('InvoiceItem', 'findMany', args, null)).not.toThrow()
    expect(args.where).toEqual({ invoiceId: 'invoice-1' })
  })
})

describe('a model nobody classified', () => {
  it('is refused rather than waved through', () => {
    // The failure mode this prevents: someone adds a model next year, forgets
    // the classification, and it silently becomes readable across churches.
    expect(() => applyOrgScope('Newsletter', 'findMany', {}, ORG)).toThrow(/Classify it/)
  })
})
