# Steward Platform

Steward Congregation (StewardChMS) is one app in the Steward platform. This
file records the platform-level constraints that apply to *this repository* and
points at the decision record that explains why they exist.

**Decision record:** https://claude.ai/code/artifact/fffcde73-8186-4c63-83f9-979d80f82f42

It covers seven decisions - hosting model, identity, tenancy, where platform
code lives, billing and entitlements, routing, and cross-app integration - plus
the phased roadmap this repository is working through.

## Where this repo sits

Congregation is **single-tenant today**. It runs on its own dedicated stack,
sold at the Managed price, and stays that way until Phase 2 ports
StewardTable's ORM-level tenancy guard into `backend/src/lib/db.ts`.

That is deliberate: revenue is not held hostage to the hardest migration. Do
not add multi-org behaviour piecemeal ahead of Phase 2 - a half-enforced
tenancy boundary is worse than an honest single-tenant one.

Congregation also owns the richest person data in the portfolio. In Phase 5 its
`Member`/`Household` models are promoted into the platform's canonical
Person/Household service, and this app becomes a client of it while keeping its
own domain-specific member fields.

## Invariants

Enforced by `scripts/ci/check-platform-boundaries.sh`, the `Platform
Boundaries` CI job.

### 1. No hardcoded platform domain

The platform root domain is configuration, never a source constant. When Phase
2 introduces host-based tenant resolution, derive it from
`PLATFORM_ROOT_DOMAIN` the way `steward-table/lib/platform-domain.ts` does.

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

## Roadmap position

- **Phase 0 (done here):** demo credentials moved to configuration, boundary
  guard in CI.
- **Phase 2 (next):** `Org` + `Membership`; `orgId` on every tenanted model via
  add -> backfill -> default -> not-null; `@@unique([orgId, ...])` throughout;
  `Setting` becomes org-scoped; the `backend/src/lib/db.ts` guard; host-based
  `req.orgId`; a **Redis or DB token blacklist** (the current in-memory one
  cannot survive a pooled multi-org deployment); kiosk `orgId` claim; wildcard
  CORS.
- **Phase 4:** an `openid-client` start/callback that mints the existing CHMS
  JWT. Kiosk activation stays exempt from SSO, permanently.
- **Phase 5:** becomes a client of the canonical Person/Household service.

See the decision record for the full sequence.
