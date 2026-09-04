# Steward Platform

Steward Congregation (StewardChMS) is one app in the Steward platform. This
file records the platform-level constraints that apply to *this repository* and
points at the decision record that explains why they exist.

**Decision record:** https://claude.ai/code/artifact/fffcde73-8186-4c63-83f9-979d80f82f42

It covers seven decisions - hosting model, identity, tenancy, where platform
code lives, billing and entitlements, routing, and cross-app integration - plus
the phased roadmap this repository is working through.

## Where this repo sits

Congregation is **multi-tenant**, and it is the app the platform sells first.
One database holds many churches; `Org` is the tenant root, and `Org.id` is the
console's `orgId` - the same value in every Steward application.

A self-hosted install is unaffected and stays first-class. With no
`PLATFORM_ROOT_DOMAIN` set there is one organization, it is resolved without a
hostname, and the app behaves exactly as it did before the platform existed.

Congregation also owns the richest person data in the portfolio. In Phase 4 its
`Member`/`Household` models are promoted into the platform's canonical
Person/Household service, and this app becomes a client of it while keeping its
own domain-specific member fields.

## Invariants

Enforced by `scripts/ci/check-platform-boundaries.sh`, the `Platform
Boundaries` CI job.

### 1. No hardcoded platform domain

The platform root domain is configuration, never a source constant. Every host
and every allowed origin derives from `PLATFORM_ROOT_DOMAIN` through
`backend/src/lib/platform-domain.ts`:

| Value                              | Derived from              |
| ---------------------------------- | ------------------------- |
| `{slug}-stewardchms.app.<root>`    | `tenantHost(slug)`        |
| the slug in a Host header          | `extractTenantSlug(host)` |
| whether an Origin may call the API | `isAllowedOrigin(origin)` |

Add new derivations there. Do not reach for the environment variable directly,
and do not reintroduce a literal domain.

The demo banner follows the same rule: it reads `VITE_DEMO_ADMIN_EMAIL` and
`VITE_DEMO_ADMIN_PASSWORD` rather than naming a domain in source, so the demo
credentials and the demo seed can never drift apart.

### 2. Platform billing is not this app's business

This app already runs Stripe for the *church's own* donor giving
(`backend/src/routes/online-giving.ts`, keys in `Setting` rows). That is
entirely separate from the money churches pay Steward for the subscription.

- `STRIPE_PLATFORM_*` credentials exist only in the console's environment and
  must never appear in this repository.
- Platform webhooks go to the console host. Tenant commerce webhooks stay on
  this app's existing endpoints. Different hostnames make misrouting
  impossible rather than merely unlikely.
- This app never imports the console's Stripe client. It knows about
  entitlements; it does not know about invoices.

## Tenancy

### The hostname decides which church

`resolveOrg` (`backend/src/middleware/org.ts`) runs before every route except
`/api/health` and `/api/internal`. It reads the slug out of the Host header,
looks the organization up, and runs the rest of the request inside it.

The hostname decides - not a header, not a query parameter, not a claim in the
caller's own token. A browser can send any header it likes; it cannot choose
which host its request arrived on, because the certificate and the router
already settled that.

`requireAuth` then checks the token *against* that organization. A session
minted for one church and presented to another church's host is rejected, and
so is a kiosk token carried down the road on a tablet.

### The guard scopes queries rather than demanding they be scoped

`backend/src/lib/prisma.ts` is a Prisma client extension. On a tenanted model it
adds `orgId` to the `where` of every read and every targeted write, and it
stamps every created row. A query that runs with no organization in context
**throws**.

This is deliberately not what Table does. Table's guard demands the caller name
the tenant and throws if they did not, which is the stronger statement - but
Congregation has 579 database calls, and retrofitting `orgId` into all of them
would mean trusting all of them forever. Injecting is the safer half of the same
idea: a route cannot forget something it never had to write.

Creates are the exception, by design. TypeScript requires `orgId` on every
`create`, so on writes the guard *verifies* rather than supplies: it refuses a
row naming a different organization instead of silently overwriting it. Writes
are where tenancy is worth making visible.

### The classification is enforced, not documented

`backend/src/lib/tenancy.ts` sorts every model into one of three sets, and
`tenancy.test.ts` reads Prisma's DMMF to check that:

- every model in the schema is in exactly one set;
- no set names a model the schema does not have;
- every tenanted model actually has an `orgId` column, and no other model does;
- every unique index on a tenanted model is scoped to the organization, with
  three deliberate exceptions the test names and explains.

A model added next year is a model nobody remembers to classify. This is what
stops an unclassified model from quietly becoming an unguarded one.

### Escaping the guard

`withoutOrgScope()` plus `_bypassOrgScope: true` is the escape hatch, for the
few operations that are about the installation rather than about a church:
resolving which organization a host belongs to, provisioning, and finding a user
by email before knowing which church they are asking for. Every use carries a
comment saying which.

### What the guard does not cover

A nested `include` of a tenanted relation from a global model is invisible to
the extension, which only ever sees the top-level model. There is one such place
- `userRoles` on `User`, read during sign-in - and it filters by `orgId`
explicitly. Adding another means doing the same.

Three line-item models (`InvoiceItem`, `PurchaseOrderItem`, `SaleItem`) have no
`orgId`. They are created as nested writes inside their parent, where nothing
could stamp them, and they are only ever read through that parent. Their
isolation is their parent's, which is a weaker guarantee than the guard gives,
and this is the honest place to say so.

## Provisioning

`POST /api/internal/provision` is how a church comes to exist in this app. The
console calls it with this app's service token (`PLATFORM_SERVICE_TOKEN`).

Two properties the console depends on:

- **`Org.id` is the console's `orgId`.** Not a mapping table, not a foreign key
  - the same value. One church has one id across all four Steward apps, forever,
  and the console mints it.
- **Idempotent by `orgId`.** The console retries with backoff, so a repeat call
  for an existing organization succeeds and changes nothing. In particular it
  does not rename a church that has since renamed itself.

A slug already held by a *different* organization returns **409**, not 500. The
console's classifier fails fast on any 4xx other than 429, so a collision
reaches an operator instead of being retried five times into the same wall.

The owner gets a membership and an administrator's role, but no password. They
arrive through the existing password-reset flow - the same path a forgotten
password takes, and so already rate-limited, audited and tested.

## Roadmap position

- **Phase 0 (done here):** demo credentials moved to configuration, boundary
  guard in CI.
- **Phase 1 (done here):** `Org` + `Membership`; `orgId` on every tenanted model
  via add -> backfill -> not-null; `@@unique([orgId, ...])` throughout; `Setting`
  is org-scoped; the guard in `backend/src/lib/prisma.ts` and the DMMF
  classification test; host-based organization resolution; the kiosk `orgId`
  claim; wildcard CORS; `POST /api/internal/provision`; a database-backed token
  blacklist, so a logout means logged out on every instance.
- **Phase 2:** an `openid-client` start/callback that mints the existing CHMS
  JWT. Kiosk activation stays exempt from SSO, permanently.
- **Phase 4:** becomes a client of the canonical Person/Household service.

See the decision record for the full sequence.
