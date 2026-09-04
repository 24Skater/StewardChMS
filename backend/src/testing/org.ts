import { PrismaClient } from '@prisma/client'

/**
 * The one organization the integration tests run inside.
 *
 * One, deliberately, and shared by every suite. `resolveOrg` falls back to the
 * sole organization in the database when no platform root domain is configured,
 * which is exactly the self-hosted shape the tests exercise — and it only works
 * while there is precisely one. A suite that created its own would break every
 * other suite by making the count two.
 */
export const TEST_ORG_ID = '00000000-0000-0000-0000-0000000000aa'

/** Creates the test organization if it is not already there. Idempotent. */
export async function ensureTestOrg(db: PrismaClient): Promise<void> {
  await db.org.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: { id: TEST_ORG_ID, slug: 'test', name: 'Test Church' },
  })
}
