# Demo Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all repo-side artifacts needed to run StewardChMS as a public demo on Railway with a nightly 1 AM UTC data reset.

**Architecture:** A new `demo-reset` cron Docker service runs `seed-demo.ts --reset` nightly alongside the existing backend/frontend/db. A `VITE_DEMO_MODE=true` env var gates a persistent banner component that tells visitors the demo resets nightly and shows credentials. All demo logic is isolated behind env vars — production is untouched.

**Tech Stack:** Docker (multi-stage build), Railway (`railway.toml` cron config), React 18 + Vite (banner component), Vitest + React Testing Library (tests)

---

## File Map

| File | Status | Purpose |
|---|---|---|
| `backend/Dockerfile.demo-reset` | Create | Cron job image — runs `seed-demo.ts --reset` |
| `railway.toml` | Create | Railway cron schedule + build config for demo-reset service |
| `docker.env.demo.example` | Create | Documents all demo env vars (no secrets) |
| `frontend/src/components/layout/DemoBanner.tsx` | Create | Gold-on-navy demo banner, gated by `VITE_DEMO_MODE` |
| `frontend/src/components/layout/DemoBanner.test.tsx` | Create | Tests for banner render / hide logic |
| `frontend/src/App.tsx` | Modify | Mount `DemoBanner` above `<Routes>` |
| `CLAUDE.md` | Modify | Add `## Demo Environment` section |

---

## Task 1: demo-reset Dockerfile

**Files:**
- Create: `backend/Dockerfile.demo-reset`

- [ ] **Step 1: Create the Dockerfile**

`backend/Dockerfile.demo-reset`:
```dockerfile
# Demo-reset cron job — runs seed-demo.ts --reset and exits
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm ci

COPY shared/ ./shared/
COPY backend/ ./backend/

WORKDIR /app/shared
RUN npm run build

WORKDIR /app/backend
RUN npx prisma generate

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed-demo.ts --reset"]
```

- [ ] **Step 2: Verify the build compiles locally**

Run from repo root:
```bash
docker build -f backend/Dockerfile.demo-reset -t stewardchms-demo-reset .
```
Expected: build completes with no errors. The image exits immediately when run without a `DATABASE_URL` (that's expected — Railway supplies it at runtime).

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile.demo-reset
git commit -m "feat: add demo-reset cron Dockerfile"
```

---

## Task 2: Railway config and demo env example

**Files:**
- Create: `railway.toml`
- Create: `docker.env.demo.example`

- [ ] **Step 1: Create railway.toml**

This file configures the `demo-reset` service in Railway. Each other service (db, backend, frontend) references its own Dockerfile in the Railway dashboard — no additional toml needed for them.

`railway.toml`:
```toml
# Railway configuration for the demo-reset cron service.
# The db, backend, and frontend services are configured in the Railway dashboard
# pointing to their existing Dockerfiles.

[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile.demo-reset"

[deploy]
cronSchedule = "0 1 * * *"
restartPolicyType = "NEVER"
```

- [ ] **Step 2: Create docker.env.demo.example**

`docker.env.demo.example`:
```bash
# Demo environment variables — copy to docker.env.demo and fill in secrets
# NEVER commit docker.env.demo to git

# Database (Railway Postgres plugin auto-sets DATABASE_URL in the dashboard)
# DATABASE_URL=postgresql://user:pass@host:5432/stewardchms

# Backend
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-to-a-32-plus-char-secret-for-demo
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-demo-frontend-url.railway.app

# Demo admin credentials (shown in DemoBanner — keep these predictable)
ADMIN_EMAIL=admin@demo.steward.app
ADMIN_PASSWORD=Demo1234!
ADMIN_NAME=Demo Administrator

# Frontend (set in Railway dashboard for the frontend service)
VITE_DEMO_MODE=true

# Optional: email address to notify when nightly reset completes
# DEMO_RESET_NOTIFY_EMAIL=you@example.com
```

- [ ] **Step 3: Ensure docker.env.demo is gitignored**

Check `.gitignore` includes `docker.env.demo`:
```bash
grep "docker.env.demo" .gitignore
```
If not found, add it:
```bash
echo "docker.env.demo" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add railway.toml docker.env.demo.example .gitignore
git commit -m "feat: add Railway cron config and demo env example"
```

---

## Task 3: DemoBanner component (TDD)

**Files:**
- Create: `frontend/src/components/layout/DemoBanner.test.tsx`
- Create: `frontend/src/components/layout/DemoBanner.tsx`

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/layout/DemoBanner.test.tsx`:
```tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemoBanner } from './DemoBanner'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DemoBanner', () => {
  it('renders the banner when VITE_DEMO_MODE is true', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    render(<DemoBanner />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText(/Demo environment/i)).toBeInTheDocument()
  })

  it('shows the reset time and credentials', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    render(<DemoBanner />)
    expect(screen.getByText(/1 AM UTC/i)).toBeInTheDocument()
    expect(screen.getByText(/admin@demo\.steward\.app/i)).toBeInTheDocument()
    expect(screen.getByText(/Demo1234!/i)).toBeInTheDocument()
  })

  it('renders nothing when VITE_DEMO_MODE is not set', () => {
    vi.stubEnv('VITE_DEMO_MODE', '')
    const { container } = render(<DemoBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when VITE_DEMO_MODE is false', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    const { container } = render(<DemoBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -w frontend -- DemoBanner --run
```
Expected: FAIL — `Cannot find module './DemoBanner'`

- [ ] **Step 3: Implement the component**

`frontend/src/components/layout/DemoBanner.tsx`:
```tsx
export function DemoBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#0D1B2E',
        color: '#E8B847',
        textAlign: 'center',
        padding: '6px 16px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
      }}
    >
      <strong>Demo environment</strong> — Pre-loaded with sample data. Resets nightly at{' '}
      <strong>1 AM UTC</strong>. Credentials:{' '}
      <code style={{ color: '#F5EED8' }}>admin@demo.steward.app</code> /{' '}
      <code style={{ color: '#F5EED8' }}>Demo1234!</code>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -w frontend -- DemoBanner --run
```
Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/DemoBanner.tsx frontend/src/components/layout/DemoBanner.test.tsx
git commit -m "feat: add DemoBanner component gated by VITE_DEMO_MODE"
```

---

## Task 4: Mount DemoBanner in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add the import and mount to App.tsx**

In `frontend/src/App.tsx`, add the import at line 68 (after the existing layout imports):
```tsx
import { DemoBanner } from './components/layout/DemoBanner'
```

Replace the `return` in the `App` function (line 74–178):
```tsx
function App() {
  return (
    <>
      <DemoBanner />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {import.meta.env.DEV && (
          <Route path="/icon-test" element={<IconTestPage />} />
        )}
        <Route path="/setup" element={<SetupWizardPage />} />
        <Route path="/kids-checkin/kiosk" element={<KioskModePage />} />
        <Route path="/give" element={<GivingPortalPage />} />
        <Route path="/kiosk/:token" element={<ScheduleKioskPage />} />
        <Route path="/give/thank-you" element={<ThankYouPage />} />

        {/* Protected Routes with App Layout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          
          {/* Groups */}
          <Route path="/groups" element={<GroupsPage />} />
          
          {/* Members */}
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberFormPage />} />
          <Route path="/members/import" element={<MemberImportPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/members/:id/edit" element={<MemberFormPage />} />
          
          {/* Households */}
          <Route path="/households" element={<HouseholdsPage />} />
          <Route path="/households/:id" element={<HouseholdDetailPage />} />
          
          {/* Events */}
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<EventFormPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/edit" element={<EventFormPage />} />
          <Route path="/occurrences/:id" element={<OccurrenceDetailPage />} />
          
          {/* Songs */}
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/songs/new" element={<SongFormPage />} />
          <Route path="/songs/:id/edit" element={<SongFormPage />} />
          
          {/* Communications */}
          <Route path="/communications" element={<MessagesPage />} />
          <Route path="/communications/new" element={<ComposeMessagePage />} />
          <Route path="/communications/:id" element={<MessageDetailPage />} />
          <Route path="/communications/templates" element={<TemplatesPage />} />
          <Route path="/communications/templates/new" element={<TemplateFormPage />} />
          <Route path="/communications/templates/:id/edit" element={<TemplateFormPage />} />
          
          {/* Giving */}
          <Route path="/giving" element={<DonationsPage />} />
          <Route path="/giving/new" element={<DonationFormPage />} />
          <Route path="/giving/:id/edit" element={<DonationFormPage />} />
          <Route path="/pledges" element={<PledgesPage />} />
          <Route path="/pledges/new" element={<PledgeFormPage />} />
          <Route path="/pledges/:id/edit" element={<PledgeFormPage />} />
          
          {/* Accounting */}
          <Route path="/funds" element={<FundsPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<ExpenseFormPage />} />
          <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          
          {/* Reports */}
          <Route path="/reports" element={<ReportsHubPage />} />
          <Route path="/reports/financial-dashboard" element={<FinancialDashboardPage />} />
          <Route path="/reports/finance" element={<FinanceReportsPage />} />
          <Route path="/reports/membership" element={<MembershipReportPage />} />
          <Route path="/reports/attendance" element={<AttendanceReportPage />} />
          <Route path="/reports/giving" element={<GivingReportPage />} />
          <Route path="/reports/sales" element={<SalesReportPage />} />
          
          {/* Products & Sales */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<SaleFormPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          
          {/* Kids Check-in */}
          <Route path="/kids-checkin" element={<KidsCheckinPage />} />

          {/* Ministry Scheduling */}
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/schedules/new" element={<ScheduleFormPage />} />
          <Route path="/schedules/:id" element={<ScheduleDetailPage />} />
          <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
          <Route path="/schedules/:id/periods/:periodId" element={<SchedulePeriodPage />} />
        </Route>
      </Routes>
    </>
  )
}
```

- [ ] **Step 2: Run existing App tests to confirm they still pass**

```bash
npm run test -w frontend -- App.test --run
```
Expected: PASS — 2 existing tests passing (banner renders null in test env since `VITE_DEMO_MODE` is unset)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: mount DemoBanner in App root"
```

---

## Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the Demo Environment section**

Add the following at the end of `CLAUDE.md`:

```markdown
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
- Demo admin credentials (`admin@demo.steward.app` / `Demo1234!`) are intentionally shown in the banner — do not rotate without updating the banner text
- Full details in memory: `C:\Users\ramos\.claude\projects\c--Users-ramos-GitHub-StewardChMS\memory\demo-deployment.md`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add demo environment section to CLAUDE.md"
```

---

## Task 6: Full test run

- [ ] **Step 1: Run all frontend tests**

```bash
npm run test -w frontend -- --run
```
Expected: all existing tests pass, 4 new DemoBanner tests pass

- [ ] **Step 2: Run typecheck across all workspaces**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 3: Verify Docker build still works for main services**

```bash
docker build -f backend/Dockerfile -t stewardchms-backend-check .
```
Expected: builds successfully (confirms no import errors leaked into production image)

---

## Railway Setup Checklist (manual — done in Railway dashboard after pushing)

These steps happen outside the repo after the above code is merged:

- [ ] Create Railway project, add `demo` environment
- [ ] Add PostgreSQL plugin → Railway auto-sets `DATABASE_URL`
- [ ] Add `backend` service → point to `backend/Dockerfile`, set env vars from `docker.env.demo.example`
- [ ] Add `frontend` service → point to `frontend/Dockerfile`, set `VITE_DEMO_MODE=true` and `CORS_ORIGIN`
- [ ] Add `demo-reset` cron service → point to repo root, Railway reads `railway.toml` for schedule + Dockerfile path
- [ ] Run `demo-reset` manually once to seed initial data
- [ ] Visit the Railway-assigned frontend URL and verify banner appears
- [ ] Update `memory/demo-deployment.md` with the live Railway URL
