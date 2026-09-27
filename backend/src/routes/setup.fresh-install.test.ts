import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { withoutOrgScope } from '../lib/org-context.js'
import { ensureTestOrg } from '../testing/org.js'

/**
 * The first request a self-hosted church ever makes: setup step 1 on an
 * installation with no organization and no users.
 *
 * It lives in its own file because it needs an *empty* installation, and every
 * other suite shares one that is not. Step 1 refuses as soon as any real user
 * exists, and the organization it has to create is the one `resolveOrg` would
 * otherwise have found. So this file clears both, and puts the shared test
 * organization back afterwards — safe only because files run one at a time.
 *
 * Requests are sent from outside the test organization. The setup file enters
 * it for every test, and a server started inside that context would hand it to
 * each request — quietly supplying the organization this path is about lacking.
 */

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip

const ADMIN = {
  email: 'first-admin@fresh-install.test',
  password: 'Fresh-Install-Passw0rd!',
  name: 'Grace Chapel',
}

describeWithDb('setup step 1 on a fresh install', () => {
  const db = new PrismaClient()

  beforeAll(async () => {
    await db.org.deleteMany({})
    await db.user.deleteMany({ where: { isSeedAccount: false } })
  })

  afterAll(async () => {
    await db.org.deleteMany({})
    await db.user.deleteMany({ where: { email: ADMIN.email } })
    await ensureTestOrg(db)
    await db.$disconnect()
  })

  it('creates the organization, its owner and the settings, and says so', async () => {
    const response = await withoutOrgScope(() =>
      request(app).post('/api/setup/step1').send(ADMIN)
    )

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)

    const orgs = await db.org.findMany()
    expect(orgs).toHaveLength(1)
    const [org] = orgs

    const admin = await db.user.findUniqueOrThrow({
      where: { email: ADMIN.email },
      include: { memberships: true },
    })
    expect(admin.isPrimaryAdmin).toBe(true)
    expect(admin.memberships).toEqual([expect.objectContaining({ orgId: org.id, isOwner: true })])

    // The two writes that used to run after the organization's scope had ended.
    const settings = await db.setting.findMany({
      where: { orgId: org.id, key: { in: ['jwt_secret', 'step1_complete'] } },
      select: { key: true },
    })
    expect(settings.map((s) => s.key).sort()).toEqual(['jwt_secret', 'step1_complete'])
  })

  it('reports the admin to the wizard afterwards', async () => {
    const response = await withoutOrgScope(() => request(app).get('/api/setup/status'))

    expect(response.status).toBe(200)
    expect(response.body.hasPrimaryAdmin).toBe(true)
  })
})
