# StewardChMS — Project Instructions

## Project Overview

Open-source Church Management System. npm monorepo with three workspaces:
`frontend` (React SPA) · `backend` (Express REST API) · `shared` (Zod schemas)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.6 (all workspaces) |
| Frontend | React 18, Vite 7, TanStack Query, Radix UI/shadcn, Tailwind CSS |
| Backend | Express 4.21, Prisma 5.20, PostgreSQL 16 |
| Auth | JWT in httpOnly cookie (`steward_session`) + RBAC permissions |
| Payments | Stripe SDK (backend) + Stripe.js (frontend) |
| Forms | React Hook Form + Zod validation |
| Testing | Vitest + Supertest (backend integration tests against real PostgreSQL) |
| CI | GitHub Actions: lint → typecheck → test → build |

## Common Commands

```bash
# Install dependencies (from root)
npm ci

# Development
npm run dev:frontend        # http://localhost:5173
npm run dev:backend         # http://localhost:3001

# Full stack via Docker
docker-compose up

# Testing
npm test                    # all workspaces
npm run test -w backend     # backend only
npm run test -w frontend    # frontend only

# Type checking & linting
npm run typecheck
npm run lint

# Database (run from root)
npm run db:generate -w backend   # regenerate Prisma client after schema changes
npm run db:migrate -w backend    # create + run new migration
npm run db:seed -w backend       # seed admin user

# Build
npm run build:frontend
npm run build:backend
npm run build -w shared          # must build shared before frontend/backend
```

## Project Structure

```
backend/src/
  routes/       # One file per domain (members, events, accounting, etc.)
  middleware/   # auth.ts (requireAuth, requirePermission), rateLimiter.ts
  lib/          # auth.ts (JWT), security.ts (token blacklist, password), audit.ts, prisma.ts
  providers/    # messaging/email-stub.ts, sms-stub.ts (stubs — not real providers)

frontend/src/
  pages/        # Page components organized by domain subdirectory
  hooks/        # One use*.ts hook file per domain
  components/   # ui/ (shadcn primitives), layout/, ProtectedRoute
  lib/          # api.ts (all API calls), pdf.ts, csv.ts, utils.ts
  context/      # AuthContext, ThemeContext

shared/src/
  schemas/      # Zod schemas shared between frontend and backend

prisma/         # schema.prisma (source of truth) + migrations/
```

## Conventions

**File naming**: kebab-case for all files (`purchase-orders.ts`, `KidsCheckinPage.tsx`)
**Components**: PascalCase (`MemberFormPage.tsx`, `ProtectedRoute.tsx`)
**Hooks**: camelCase with `use` prefix (`useMembers.ts`, `useAccounting.ts`)
**Tests**: co-located with source, named `*.test.ts` or `*.test.tsx`
**Commits**: conventional — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

**Auth pattern**: every protected backend route uses `requireAuth()` then `requirePermission('permission.key')`. Permission keys follow `resource.action` format (e.g. `members.view`, `members.edit`).

**Tenancy**: one database holds many churches. `resolveOrg` reads the church out of the request hostname and runs the request inside it; the Prisma client in `backend/src/lib/prisma.ts` then scopes every read and stamps every write. You do not add `orgId` to a `where` clause — the guard does. You *do* pass `orgId: requireOrgId()` to every `create`, because TypeScript asks for it and a visible write is worth the keystrokes. A query with no organization in context throws rather than returning every church's rows. Classify any new model in `backend/src/lib/tenancy.ts`, or `tenancy.test.ts` will fail the build. Full reasoning in [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md).

**Adding a new domain feature**:
1. Add Prisma model with an `orgId` → classify it in `backend/src/lib/tenancy.ts` → `npm run db:migrate -w backend`
2. Add Zod schemas in `shared/src/schemas/`
3. Add route file in `backend/src/routes/` and register in `backend/src/app.ts`
4. Add hook in `frontend/src/hooks/`
5. Add API functions in `frontend/src/lib/api.ts` (or ideally a new `api/<domain>.ts` file)
6. Add page components in `frontend/src/pages/<domain>/`
7. Register routes in `frontend/src/App.tsx`

## Environment Setup

```bash
cd backend
cp env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET (min 32 chars in prod), CORS_ORIGIN
```

Required env vars: `DATABASE_URL`, `JWT_SECRET`
Optional: `PORT` (default 3001), `CORS_ORIGIN` (default `http://localhost:5173`), `JWT_EXPIRES_IN` (default `7d`)

## Documentation

Full technical documentation lives in [`docs/`](docs/README.md). Key references:

| Need | Document |
| --- | --- |
| How the system works end-to-end | [`docs/architecture.md`](docs/architecture.md) |
| Auth, JWT, and permission keys | [`docs/auth-permissions.md`](docs/auth-permissions.md) |
| Every API error code and shape | [`docs/api-errors.md`](docs/api-errors.md) |
| All Prisma models documented | [`docs/database-schema.md`](docs/database-schema.md) |
| Tenancy: the guard, host resolution, sign-in scoping | [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) |
| Frontend patterns (hooks, forms, icons) | [`docs/frontend-guide.md`](docs/frontend-guide.md) |
| Adding a new feature domain | [`docs/extending.md`](docs/extending.md) |
| Production deployment | [`docs/deployment.md`](docs/deployment.md) |
| Per-domain references (endpoints, models) | [`docs/domains/`](docs/domains/) |
| Brand identity, logo usage, voice | [`docs/brand/brand-guide.md`](docs/brand/brand-guide.md) |
| AI branding instructions (skill) | [`docs/brand/steward-branding-skill.md`](docs/brand/steward-branding-skill.md) |

## Brand Identity

**When working on any UI, documentation, or visual element, read `docs/brand/steward-branding-skill.md` first.**

Key brand facts:

- **Mark:** Cross Key (a key whose bow is a Latin cross) — NOT the old shield
- **Palette:** Deep navy (`#0D1B2E`) + kingdom gold (`#E8B847`) + parchment (`#F5EED8`)
- **Wordmark:** Georgia light, wide tracking (0.32em), all-caps `STEWARD`
- **Logo files:** `frontend/public/steward-mark.svg` (dark), `steward-mark-light.svg` (light), `steward-lockup.svg` (horizontal)
- **Voice:** Faithful, servant-minded, trustworthy — never cold/corporate

## Known Issues / TODOs

- `frontend/src/lib/api.ts` is 1,986 lines — split into per-domain modules when touching this file
- Messaging providers are stubs — `email-stub.ts` and `sms-stub.ts` only log to console
- Frontend stores auth token in `localStorage` as fallback — backend httpOnly cookie is the intended path

## Demo Environment

A public demo deployment lives on Railway (`demo` environment, same repo). It uses identical Docker images with different env vars and resets nightly at 1 AM UTC via a cron service.

**Key files:**

- `railway.toml` — Railway cron config for the `demo-reset` service
- `backend/Dockerfile.demo-reset` — cron job image
- `backend/prisma/seed-demo.ts` — demo seeder (already has `--reset` support)
- `frontend/src/components/layout/DemoBanner.tsx` — banner gated by `VITE_DEMO_MODE=true`
- `docker.env.demo.example` — env var reference (copy, never commit filled version)

**Rules:**

- Never set `VITE_DEMO_MODE=true` in production
- Never modify `clearDemoData()` or the `--reset` flag without testing a full reset cycle
- Demo admin credentials are intentionally shown in the banner. The banner reads `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD`, so rotate them by changing the env vars on both services (`ADMIN_EMAIL`/`ADMIN_PASSWORD` on the backend, the `VITE_*` pair on the frontend) — never by editing the banner text
- Full details in memory: `C:\Users\ramos\.claude\projects\c--Users-ramos-GitHub-StewardChMS\memory\demo-deployment.md`
