import { PrismaClient } from '@prisma/client'
import { currentOrgId } from './org-context.js'
import { applyOrgScope } from './tenancy.js'

/**
 * The database client, with tenancy enforced inside it.
 *
 * Every query against a model that holds a church's data is scoped to the
 * organization in context, and every row created is stamped with it. A query
 * that runs with no organization in context throws rather than returning every
 * church's rows — the failure mode of forgetting is a loud error, not a leak.
 *
 * This is deliberately different from Table, where the guard demands the caller
 * name the tenant and throws if they did not. That works there; here it would
 * mean editing 579 call sites and trusting all of them forever. Injecting is
 * the safer half of the same idea: a route cannot forget something it never had
 * to write.
 *
 * The escape hatch is `_bypassOrgScope: true`, for the few operations that are
 * about the installation rather than a church. Every use of it should carry a
 * comment saying which.
 */

function createPrismaClient() {
  const client = new PrismaClient()

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Prisma's per-operation argument union is wider than anything this
          // function touches; this structural view is exactly the keys it reads.
          const bag = args as Record<string, unknown> & { _bypassOrgScope?: boolean }

          if (bag?._bypassOrgScope === true) {
            delete bag._bypassOrgScope
            return query(args)
          }

          applyOrgScope(model ?? '', operation, bag, currentOrgId())

          return query(args)
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

// Cast back to PrismaClient so model accessors and argument types stay visible
// to TypeScript. The runtime value is the extended client.
export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as unknown as ExtendedPrismaClient
}

export default prisma
