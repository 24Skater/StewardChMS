# Demo Deployment Design

**Date:** 2026-06-02
**Status:** Approved
**Topic:** Public demo environment with nightly auto-reset

---

## Overview

A publicly accessible demo of StewardChMS hosted on Railway, pre-loaded with realistic church seed data, that resets itself nightly at 1 AM UTC. Lives in the same GitHub repo as production. Zero changes to the production codebase.

---

## Section 1: Infrastructure & Services

### Platform
- **Host:** Railway
- **Repo:** Same repo (`StewardChMS`), Railway `demo` environment
- **Config:** `railway.toml` at repo root — fully declarative, no manual Railway UI setup required

### Services
| Service | Dockerfile | Type | Notes |
|---|---|---|---|
| `db` | (Railway Postgres plugin) | Persistent | Same PostgreSQL 16 as production |
| `backend` | `backend/Dockerfile` | Persistent | Same image, demo env vars |
| `frontend` | `frontend/Dockerfile` | Persistent | Same image, `VITE_DEMO_MODE=true` |
| `demo-reset` | `backend/Dockerfile.demo-reset` | Cron job | Runs at `0 1 * * *` UTC, exits after ~30s |

### Env Var Reference
A `docker.env.demo.example` file documents all demo-specific vars:

```
ADMIN_EMAIL=admin@demo.steward.app
ADMIN_PASSWORD=Demo1234!
ADMIN_NAME=Demo Administrator
JWT_SECRET=<32+ char secret, set in Railway dashboard>
CORS_ORIGIN=https://<railway-assigned-demo-url>
VITE_DEMO_MODE=true
DEMO_RESET_NOTIFY_EMAIL=  # optional, notify on reset
```

Actual secrets are set in the Railway dashboard, never committed.

---

## Section 2: The Reset Service

### Dockerfile
`backend/Dockerfile.demo-reset` — extends the backend build image, overrides the entrypoint:

```sh
npx prisma migrate deploy && npx tsx prisma/seed-demo.ts --reset
```

Identical pattern to the existing `backend/Dockerfile.migrate`.

### Behavior
- Runs on Railway cron schedule: `0 1 * * *` (1 AM UTC daily)
- `seed-demo.ts --reset` calls `clearDemoData()` then re-seeds all demo records
- Auth tables (users, roles, permissions) are **preserved** — admin credentials stay stable
- All church data (members, events, donations, groups, etc.) is wiped and reseeded
- Service exits after completion; Railway bills ~1 min compute per day
- `seed-demo.ts` requires **no changes** — the `--reset` flag and `clearDemoData()` already exist

### Optional Notification
If `DEMO_RESET_NOTIFY_EMAIL` env var is set, the seeder logs a completion notice via the backend's email stub. Low priority, can be added post-launch.

---

## Section 3: Frontend Demo Banner

### Component
`frontend/src/components/layout/DemoBanner.tsx`

- Renders only when `import.meta.env.VITE_DEMO_MODE === 'true'`
- Fixed position at top of page, above main nav, full width
- No close button — always visible so visitors understand the context

### Content
```
Demo environment — Pre-loaded with sample data. Resets nightly at 1 AM UTC.
Credentials: admin@demo.steward.app / Demo1234!
```

### Styling
- Background: deep navy `#0D1B2E`
- Text/accent: kingdom gold `#E8B847`
- Matches brand identity — reads as intentional, not a warning

### Mounting
Added once in `App.tsx` outside the router — visible on every page including the login screen. In production (`VITE_DEMO_MODE` unset or false), renders `null`.

---

## Section 4: Claude Session Reminder

### Memory File
`C:\Users\ramos\.claude\projects\c--Users-ramos-GitHub-StewardChMS\memory\demo-deployment.md`

Auto-loaded at the start of every Claude session in this repo. Contains:
- Railway project name and demo URL (once known)
- Admin credentials for the demo
- Reset schedule and key files
- Rule: never modify `seed-demo.ts` reset behavior without verifying the Railway cron service

### CLAUDE.md Addition
A `## Demo Environment` section appended to `CLAUDE.md` that:
- Notes the demo exists and where it lives
- Points to the memory file for full details
- Flags the key files: `railway.toml`, `backend/Dockerfile.demo-reset`, `backend/prisma/seed-demo.ts`, `frontend/src/components/layout/DemoBanner.tsx`

---

## Key Files (New or Modified)

| File | Status | Purpose |
|---|---|---|
| `railway.toml` | New | Declares all Railway services and cron schedule |
| `docker.env.demo.example` | New | Documents demo env vars (no secrets) |
| `backend/Dockerfile.demo-reset` | New | Cron job image for nightly reset |
| `frontend/src/components/layout/DemoBanner.tsx` | New | Demo banner component |
| `frontend/src/App.tsx` | Modified | Mount DemoBanner |
| `CLAUDE.md` | Modified | Add Demo Environment section |
| `C:\Users\ramos\.claude\projects\...\memory\demo-deployment.md` | New | Session memory for Claude |

---

## Migration Path

If the demo outgrows Railway (traffic, cost, features):
1. Export Railway env vars
2. Copy `railway.toml` service definitions as reference
3. Point Docker Compose stack at a VPS
4. Replace Railway cron with `crontab -e` entry: `0 1 * * * cd /app && npx tsx prisma/seed-demo.ts --reset`

No code changes required — the reset service and seeder are platform-agnostic.

---

## Out of Scope

- Rate limiting or abuse protection on the demo (can add later)
- Stripe/payment sandbox in demo (stubs are sufficient)
- Analytics on demo usage
- Custom domain for demo URL (Railway's assigned URL is fine initially)
