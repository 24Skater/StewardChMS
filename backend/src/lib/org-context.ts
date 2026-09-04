import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * The organization the current request belongs to.
 *
 * This exists so that tenancy is not something 579 database calls have to
 * remember. The alternative — every `where` clause naming its own `orgId` — is
 * one forgotten clause away from a church reading another church's members,
 * and forgetting is silent. Here, forgetting throws.
 *
 * Set once, by the org middleware, for the whole request. Everything below the
 * middleware reads it without being passed it, because passing it through
 * thirty layers of route handler is how it ends up missing from one of them.
 */

export interface OrgContext {
  orgId: string
  slug: string
}

const storage = new AsyncLocalStorage<OrgContext>()

/** Runs `fn` with `context` visible to every database call it makes. */
export function runInOrg<T>(context: OrgContext, fn: () => T): T {
  return storage.run(context, fn)
}

/** The current organization, or null outside a request. */
export function currentOrg(): OrgContext | null {
  return storage.getStore() ?? null
}

/** The current organization id, or null outside a request. */
export function currentOrgId(): string | null {
  return storage.getStore()?.orgId ?? null
}

/**
 * The current organization id, or a thrown error.
 *
 * For code that genuinely cannot proceed without one — as opposed to the
 * database guard, which produces its own message naming the model.
 */
export function requireOrgId(): string {
  const orgId = currentOrgId()
  if (!orgId) {
    throw new Error('[Tenancy] No organization in context.')
  }
  return orgId
}

/**
 * Enters an organization for the rest of this execution, without a callback to
 * wrap.
 *
 * `runInOrg` is the right tool almost everywhere, because a scope with an end
 * is a scope you cannot forget to leave. This exists for the one place with no
 * function to wrap: a test process, which wants every direct database call in
 * the file to belong to the test church.
 */
export function enterOrg(context: OrgContext): void {
  storage.enterWith(context)
}

/**
 * Runs `fn` with no organization in context, so the guard demands an explicit
 * `orgId` instead of supplying one.
 *
 * For the handful of operations that are genuinely about the installation
 * rather than about a church: provisioning, signing in (which has to find the
 * user before it knows which church they are asking for), and cross-org
 * maintenance. Every call site should say which of those it is.
 */
export function withoutOrgScope<T>(fn: () => T): T {
  return storage.exit(fn)
}
