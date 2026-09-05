# Multi-tenancy

One StewardChMS database can hold many churches. This file is the developer
reference for how that is enforced, and for the configuration a self-hosted
install may want.

Everything below works standalone. Nothing here requires a Steward account or
anything Steward hosts — with no platform configured there is one organization,
it is resolved without a hostname, and the app behaves exactly as it did before
any of this existed.

## The shape

`Org` is the tenant root. `Membership` is a person's link to one church.

`User` is deliberately **global** — one person may serve two churches with one
login — so everything church-shaped about them hangs off `Membership` instead,
including their role grants: `UserRole` carries an `orgId`, because the same
person can be an administrator of one church and a volunteer in another.

Thirty-six models carry an `orgId`. Every uniqueness rule that quietly assumed
one church per database is scoped to the organization, so two churches may both
have a fund called General, a member with the same email address, and an invoice
numbered 1.

## The guard scopes queries rather than demanding they be scoped

`backend/src/lib/prisma.ts` is a Prisma client extension. On a tenanted model it
adds `orgId` to the `where` of every read and every targeted write, and stamps
every created row. **A query that runs with no organization in context throws.**

```
[Tenancy] findMany on Member with no organization in context.
```

You do not add `orgId` to a `where` clause — the guard does. You *do* pass
`orgId: requireOrgId()` to every `create`, because TypeScript asks for it: on
writes the guard **verifies** rather than supplies, refusing a row that names a
different organization instead of silently overwriting it. Writes are where
tenancy is worth making visible, and there are sixty of them rather than five
hundred.

That is a deliberate difference from StewardTable, whose guard demands the
caller name the tenant and throws if they did not. That is the stronger
statement, and it was the wrong one here: this app has 579 database calls, and
retrofitting a tenant id into all of them would mean trusting all of them
forever. Injecting is the safer half of the same idea — a route cannot forget
something it never had to write.

## The classification is enforced, not documented

`backend/src/lib/tenancy.ts` sorts every model into one of three sets, and
`tenancy.test.ts` reads Prisma's DMMF to check that:

- every model in the schema is in exactly one set;
- no set names a model the schema does not have;
- every tenanted model actually has an `orgId` column, and no other model does;
- every unique index on a tenanted model is scoped, with three deliberate
  exceptions the test names and explains.

A model added next year is a model nobody remembers to classify. That test is
what stops it from quietly becoming an unguarded one.

### Escaping the guard

`withoutOrgScope()` plus `_bypassOrgScope: true`, for the few operations that
are about the installation rather than about a church: resolving which
organization a host belongs to, and finding a user by email before knowing which
church they are asking for. Every use carries a comment saying which.

### What the guard does not cover

A nested `include` of a tenanted relation from a global model is invisible to
the extension, which only ever sees the top-level model. There is one such place
— `userRoles` on `User`, read during sign-in — and it filters by `orgId`
explicitly. Adding another means doing the same.

Three line-item models (`InvoiceItem`, `PurchaseOrderItem`, `SaleItem`) have no
`orgId`. They are created as nested writes inside their parent, where nothing
could stamp them, and are only ever read through that parent. Their isolation is
their parent's, which is a weaker guarantee than the guard gives, and this is the
honest place to say so.

## Which church a request belongs to

`resolveOrg` (`backend/src/middleware/org.ts`) runs before every route except
`/api/health`. **The hostname decides** — not a header, not a query parameter,
not a claim in the caller's own token. A browser can send any header it likes;
it cannot choose which host its request arrived on.

`requireAuth` then checks the token *against* that organization. A session minted
for one church and presented to another church's host is rejected, and so is a
kiosk token carried down the road on a tablet.

Hosts derive from `PLATFORM_ROOT_DOMAIN` through
`backend/src/lib/platform-domain.ts` — never from a literal in source, which
`scripts/ci/check-platform-boundaries.sh` enforces:

| Value                              | Derived from              |
| ---------------------------------- | ------------------------- |
| `{slug}-stewardchms.app.<root>`    | `tenantHost(slug)`        |
| the slug in a Host header          | `extractTenantSlug(host)` |
| whether an Origin may call the API | `isAllowedOrigin(origin)` |

**Leave `PLATFORM_ROOT_DOMAIN` unset if you are running your own copy.** The app
then resolves the single organization in the database and needs no hostname
scheme at all. `POST /api/setup/step1` creates that organization on first run.

## Sign-in

A user who exists but does not belong to the church being signed into is told
*"invalid email or password"* — the same answer as a user who does not exist.
Anything else answers *"does this person attend that church?"* to anyone who
asks.

## Revoked tokens

Logging out writes the token's `jti` to `revoked_tokens`, and `verifyToken()`
checks that table on every authenticated request. So a logout is a logout on
every instance, and it survives a restart.

There is deliberately no cache in front of that lookup: a cache with any
staleness means a logged-out token still works for that long, which is the exact
thing it exists to prevent. If the database cannot be read, a validly-signed
token is honoured and the failure logged — refusing every signed-in request
during a blip is a worse outage than honouring a token somebody logged out of
minutes ago.
