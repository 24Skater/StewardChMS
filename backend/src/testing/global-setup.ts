import { PrismaClient } from '@prisma/client'
import { ensureTestOrg } from './org.js'

/**
 * Creates the one organization the integration tests run inside, once, before
 * any suite starts.
 *
 * Doing it here rather than in each suite's `beforeAll` is not only less
 * repetition: `resolveOrg` falls back to the *sole* organization in the
 * database, so two suites each creating their own would make the count two and
 * every request in the run would 404.
 *
 * Uses a plain client on purpose. The application's client enforces tenancy,
 * and this is the row tenancy is measured against — it cannot be created from
 * inside the organization it creates.
 */
export default async function setup(): Promise<void> {
  if (!process.env.DATABASE_URL) return

  const db = new PrismaClient()
  try {
    await ensureTestOrg(db)
  } catch (error) {
    // A DATABASE_URL that points at nothing is the normal state of a laptop
    // that is only running the unit tests. The integration suites already skip
    // themselves; failing the whole run here would stop the ones that do not
    // need a database from running at all.
    console.warn('Test organization not created:', error instanceof Error ? error.message : error)
  } finally {
    await db.$disconnect()
  }
}
