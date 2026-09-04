/**
 * Which models hold a church's data, and which do not.
 *
 * The three sets below must together name every model in the schema. That is
 * not a convention — `tenancy.test.ts` reads Prisma's own DMMF and fails if a
 * model is missing from all three, so a model added next year cannot quietly
 * default to "unguarded".
 */

/**
 * Models carrying a non-nullable `orgId`. Reads are scoped to the current
 * organization and creates are stamped with it, by `lib/prisma.ts`.
 */
export const TENANTED_MODELS = new Set([
  'auditlog',
  'calendarrotationmember',
  'checkin',
  'donation',
  'event',
  'eventoccurrence',
  'expense',
  'fund',
  'group',
  'groupleader',
  'groupmember',
  'household',
  'householdmember',
  'inventorytransaction',
  'invoice',
  'member',
  'membership',
  'message',
  'messagerecipient',
  'messagetemplate',
  'ministry',
  'ministrycalendar',
  'optinpreference',
  'pledge',
  'product',
  'purchaseorder',
  'registration',
  'sale',
  'scheduleperiod',
  'scheduleslot',
  'setting',
  'slotassignment',
  'song',
  'userrole',
  'vendor',
  'worshipplan',
  'worshipplanitem',
])

/**
 * Line items with no `orgId` of their own, reachable only through a tenanted
 * parent and created only as part of one.
 *
 * They have no column to check, so the guard cannot check them. Their isolation
 * comes from the parent's — an invoice's items are as private as the invoice.
 * That is a weaker guarantee than the guard gives, and this is the honest place
 * to say so. The reason they are not tenanted is concrete: all three are
 * written as nested `create` blocks inside their parent, where a query
 * extension never sees them and could not stamp an `orgId` on them.
 */
export const PARENT_SCOPED_MODELS = new Set(['invoiceitem', 'purchaseorderitem', 'saleitem'])

/**
 * Models that are genuinely not one church's data.
 *
 * `user` is here because one person may serve several churches with one login;
 * the church-shaped half of their identity is `membership`. `role`, `permission`
 * and `rolepermission` are the installation's RBAC catalogue, identical for
 * everyone. `org` is the tenant root itself.
 */
export const GLOBAL_MODELS = new Set([
  'org',
  'passwordresettoken',
  'permission',
  'role',
  'rolepermission',
  'user',
])

const READ_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

/** Operations that select existing rows by `where` in order to change them. */
const WHERE_WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany'])

type Payload = Record<string, unknown> | undefined

function createPayloads(operation: string, args: Record<string, unknown>): Payload[] {
  if (operation === 'create') return [args.data as Payload]
  if (operation === 'upsert') return [args.create as Payload]
  if (operation === 'createMany') {
    const data = args.data
    return Array.isArray(data) ? (data as Payload[]) : [data as Payload]
  }
  return []
}

/**
 * Narrows one database operation to one organization, in place.
 *
 * Reads and targeted writes gain `where.orgId`; created rows are stamped with
 * it. Anything not tenanted passes through untouched, and anything nobody
 * classified throws rather than passing through — a model that is new is far
 * more likely to be new tenant data than a new global.
 *
 * Separated from the client so it can be tested without a database. Everything
 * it does is decidable from the model name, the operation and the arguments.
 */
export function applyOrgScope(
  model: string,
  operation: string,
  args: Record<string, unknown>,
  orgId: string | null
): void {
  const name = model.toLowerCase()

  if (!TENANTED_MODELS.has(name)) {
    if (!PARENT_SCOPED_MODELS.has(name) && !GLOBAL_MODELS.has(name)) {
      throw new Error(
        `[Tenancy] ${model} is in none of TENANTED_MODELS, PARENT_SCOPED_MODELS or ` +
          `GLOBAL_MODELS. Classify it in lib/tenancy.ts.`
      )
    }
    return
  }

  if (!orgId) {
    throw new Error(
      `[Tenancy] ${operation} on ${model} with no organization in context. Requests get one ` +
        `from the org middleware; background work must use withoutOrgScope() and pass ` +
        `_bypassOrgScope: true, saying why.`
    )
  }

  if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation) || operation === 'upsert') {
    args.where = { ...((args.where as object) ?? {}), orgId }
  }

  for (const payload of createPayloads(operation, args)) {
    if (!payload) continue
    const existing = payload.orgId
    if (existing !== undefined && existing !== orgId) {
      throw new Error(
        `[Tenancy] ${operation} on ${model} carries orgId ${String(existing)} while the request ` +
          `belongs to ${orgId}. Writing into another organization is never right.`
      )
    }
    payload.orgId = orgId
  }
}
