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

**Adding a new domain feature**:
1. Add Prisma model → `npm run db:migrate -w backend`
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
| All 42 Prisma models documented | [`docs/database-schema.md`](docs/database-schema.md) |
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
- Token blacklist is in-memory — won't survive restarts (needs Redis or DB table for production)
- Messaging providers are stubs — `email-stub.ts` and `sms-stub.ts` only log to console
- Frontend stores auth token in `localStorage` as fallback — backend httpOnly cookie is the intended path
