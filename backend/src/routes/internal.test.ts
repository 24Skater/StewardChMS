import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'

const TOKEN = 'stw_svc_chms_test-token-0123456789'
const PROVISIONED_ORG = '11111111-2222-3333-4444-555555555555'

beforeAll(() => {
  process.env.PLATFORM_SERVICE_TOKEN = TOKEN
})

describe('POST /api/internal/provision', () => {
  it('refuses a request with no token', async () => {
    const response = await request(app).post('/api/internal/provision').send({})
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ state: 'failed', error: 'unauthorized' })
  })

  it("refuses another product's token", async () => {
    // One secret per app: a leak from VBS must not provision a church here.
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', 'Bearer stw_svc_vbs_test-token-0123456789')
      .send({ orgId: PROVISIONED_ORG, slug: 'grace', organizationName: 'Grace' })

    expect(response.status).toBe(401)
  })

  it('rejects a body that is not a provisioning request', async () => {
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ orgId: 'not-a-uuid', slug: 'grace', organizationName: 'Grace' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid_request')
  })

  it('rejects a slug the platform would never issue', async () => {
    // 400 rather than 500: the console must not retry into a permanent no.
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ orgId: PROVISIONED_ORG, slug: 'Grace Church!', organizationName: 'Grace' })

    expect(response.status).toBe(400)
  })
})

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

describeWithDb('provisioning against a database', () => {
  const db = new PrismaClient()

  afterAll(async () => {
    await db.org.deleteMany({ where: { id: PROVISIONED_ORG } })
    await db.$disconnect()
  })

  it('creates the organization with the id the console minted', async () => {
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        orgId: PROVISIONED_ORG,
        slug: 'provision-test',
        organizationName: 'Provision Test Church',
      })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ state: 'ready', orgId: PROVISIONED_ORG, created: true })

    // Org.id IS the console's orgId. Not a mapping table, not a foreign key —
    // the same value, in all four applications, forever.
    const org = await db.org.findUnique({ where: { id: PROVISIONED_ORG } })
    expect(org?.slug).toBe('provision-test')
    expect(org?.name).toBe('Provision Test Church')
  })

  it('is idempotent, because the console retries', async () => {
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        orgId: PROVISIONED_ORG,
        slug: 'provision-test',
        organizationName: 'Renamed Since',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ state: 'ready', orgId: PROVISIONED_ORG, created: false })

    // A retry must not rename a church that has renamed itself since.
    const org = await db.org.findUnique({ where: { id: PROVISIONED_ORG } })
    expect(org?.name).toBe('Provision Test Church')
  })

  it('reports a slug collision as 409 rather than failing', async () => {
    const response = await request(app)
      .post('/api/internal/provision')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({
        orgId: '99999999-8888-7777-6666-555555555555',
        slug: 'provision-test',
        organizationName: 'Someone Else',
      })

    // The console's classifier fails fast on any 4xx other than 429, so this
    // reaches an operator instead of burning five retries against a wall.
    expect(response.status).toBe(409)
    expect(response.body.error).toBe('slug_taken')
  })

  it('gives the church the settings its first page needs', async () => {
    const settings = await db.setting.findMany({ where: { orgId: PROVISIONED_ORG } })
    const names = settings.map((s) => `${s.category}.${s.key}`)

    expect(names).toContain('branding.church_name')
    expect(names).toContain('system.setup_complete')
  })
})
