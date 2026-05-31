<div align="center">

<img src="docs/assets/hero.svg" alt="Steward ChMS — Open Source Church Management System" width="100%"/>

<br/>

[![CI](https://github.com/24Skater/StewardChMS/actions/workflows/ci.yml/badge.svg)](https://github.com/24Skater/StewardChMS/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.20-2d3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen)](CONTRIBUTING.md)

<br/>

[Features](#features) &nbsp;·&nbsp; [Architecture](#architecture) &nbsp;·&nbsp; [Data Model](#data-model) &nbsp;·&nbsp; [Getting Started](#getting-started) &nbsp;·&nbsp; [Development](#development) &nbsp;·&nbsp; [Contributing](#contributing)

</div>

---

## What is Steward ChMS?

**Steward ChMS** is a free, open-source **Church Management System** built for modern ministry teams. It covers the full lifecycle of church operations — member CRM, kids check-in, worship planning, online giving, and financial reporting — in a single integrated platform.

> *"Moreover, it is required of stewards that they be found faithful."* — 1 Corinthians 4:2

<br/>

<table>
<tr>
<td align="center" width="25%"><br/><strong>People First</strong><br/><sub>Rich member and household CRM with pastoral notes, household linking, and smart search</sub><br/><br/></td>
<td align="center" width="25%"><br/><strong>Ministry-Grade</strong><br/><sub>Built specifically for churches — not adapted from a generic CRM or SaaS template</sub><br/><br/></td>
<td align="center" width="25%"><br/><strong>Self-Hosted</strong><br/><sub>Run it on your own infrastructure. Your data stays yours, forever.</sub><br/><br/></td>
<td align="center" width="25%"><br/><strong>Open Source</strong><br/><sub>MIT licensed. Inspect, extend, and contribute. No vendor lock-in.</sub><br/><br/></td>
</tr>
</table>

---

## Features

<img src="docs/assets/sections/people.svg" alt="People &amp; Families" width="100%"/>

Manage your congregation with a complete member CRM. Track relationships, household connections, pastoral notes, and communication preferences — all searchable and exportable.

| Feature | Details |
|---------|---------|
| **Member Profiles** | Full contact info, status, custom notes, photo |
| **Household Linking** | Connect family members; household-level view |
| **Pastoral Notes** | Private staff-only notes per member |
| **CSV Bulk Import** | Import hundreds of members from a spreadsheet |
| **Smart Search** | Find anyone instantly by name, phone, or email |
| **Status Tracking** | Active, Visitor, Inactive, Deceased |
| **Tags** | Freely assign searchable tags to any member |

<br/>

<img src="docs/assets/sections/ministry.svg" alt="Ministries &amp; Groups" width="100%"/>

Organize your church's structure from top-level ministries down to individual small groups or classes.

| Feature | Details |
|---------|---------|
| **Ministry Hierarchy** | Church → Ministry → Group structure |
| **Group Management** | Small groups, classes, volunteer teams |
| **Leader Roles** | Assign leaders with scoped permissions |
| **Member Assignment** | Add members to multiple groups simultaneously |

<br/>

<img src="docs/assets/sections/events.svg" alt="Events &amp; Check-In" width="100%"/>

From Sunday services to special events — schedule, register, attend, and check in.

| Feature | Details |
|---------|---------|
| **Event Scheduling** | One-time and recurring event patterns |
| **Online Registration** | Members sign up through the portal |
| **Attendance Tracking** | Manual and QR-based check-in |
| **Kids Check-In** | Secure parent/child check-in with security codes |
| **Kiosk Mode** | Full-screen self-service check-in station with light and dark mode |
| **Label Printing** | Thermal label with child name, security code, allergy alert |
| **Allergy Alerts** | Highlighted on labels and confirmation screens |
| **Auto-Reset** | Kiosk returns to idle after 60 seconds of inactivity |

<br/>

<img src="docs/assets/sections/scheduling.svg" alt="Ministry Scheduling" width="100%"/>

Schedule rotating volunteers for services, manage monthly duty rosters, and share live TV or kiosk displays.

| Feature | Details |
|---------|---------|
| **Rotation Calendars** | Assign volunteers to recurring service slots |
| **Monthly Periods** | Draft and publish monthly schedules |
| **Auto-Generation** | Auto-fill slots from the rotation list |
| **TV Kiosk View** | Public URL for a full-screen schedule display with light and dark mode |
| **Secure Share Token** | Regenerate the public link any time |
| **Slot Assignments** | Track who is assigned to each specific duty |
| **Conflict Detection** | Flag members assigned to overlapping slots |

<br/>

<img src="docs/assets/sections/worship.svg" alt="Worship Planning" width="100%"/>

Build complete service orders with a song library, key management, and worship set planning.

| Feature | Details |
|---------|---------|
| **Song Library** | Store songs with title, author, key, BPM, lyrics |
| **Service Plans** | Build ordered worship sets tied to events |
| **Key Transposition** | Track song keys per vocalist or band |
| **Rehearsal Notes** | Add notes visible to worship team |
| **Worship Plan PDF** | Export the full set list for rehearsal |

<br/>

<img src="docs/assets/sections/communications.svg" alt="Communication Center" width="100%"/>

Send emails and SMS messages to individuals, groups, or the entire congregation. Track every message and respect opt-out preferences.

| Feature | Details |
|---------|---------|
| **Email and SMS** | Multi-channel messaging (stub providers; plug in SendGrid or Twilio) |
| **Audience Targeting** | Message by ministry, group, status, or individual |
| **Message Templates** | Save and reuse frequently sent messages |
| **Message History** | Full log of all sent communications |
| **Opt-In Preferences** | Per-member channel opt-in/opt-out tracking |
| **Delivery Status** | Track sent, failed, and bounced messages |

<br/>

<img src="docs/assets/sections/giving.svg" alt="Giving &amp; Accounting" width="100%"/>

Full stewardship suite — from Stripe-powered online giving through to general ledger reporting.

| Feature | Details |
|---------|---------|
| **Online Giving Portal** | Stripe-powered public giving page |
| **Donation Recording** | Cash, check, card, ACH — any method |
| **Fund Accounting** | Multiple designated funds with restrictions |
| **Pledge Management** | Track pledge commitments and fulfillment |
| **Donor Statements** | Year-end contribution summary for taxes |
| **Expense Tracking** | Categorized expense recording by fund |
| **Vendor Management** | Payee records, payment history |
| **Purchase Orders** | PO creation, approval, and receipt |
| **Invoices** | Issue and track invoices with line items |
| **Accounting Reports** | Fund balances, income vs. expense |

<br/>

<img src="docs/assets/sections/reports.svg" alt="Reports &amp; Analytics" width="100%"/>

Every module has export capabilities. The reporting hub provides pre-built reports for leadership and accounting.

| Feature | Details |
|---------|---------|
| **Membership Report** | Status breakdown, missing data alerts |
| **Attendance Report** | Trends by event type and date range |
| **Giving Report** | Donor totals, fund breakdown, year-over-year |
| **Financial Dashboard** | KPIs, bar charts, pie charts, YTD summary |
| **Finance Report** | Expenses, income, balance by fund |
| **Sales Report** | Revenue by product, date range |
| **CSV Export** | Every report downloads as a spreadsheet |
| **PDF Generation** | Print-ready formatted reports |

<br/>

<img src="docs/assets/sections/sales.svg" alt="Sales &amp; Inventory" width="100%"/>

Simple point-of-sale and inventory management for church bookstores, fundraising, or resource sales.

| Feature | Details |
|---------|---------|
| **Product Catalog** | Manage products with price and description |
| **Inventory Tracking** | Real-time stock levels with transaction log |
| **Simple POS** | Quick checkout with customer linkage |
| **Sales Reports** | Revenue, items sold, and inventory analysis |

<br/>

<img src="docs/assets/sections/security.svg" alt="Security &amp; Access Control" width="100%"/>

Enterprise-grade auth and permissions in a package built for ministry teams.

| Feature | Details |
|---------|---------|
| **JWT Authentication** | httpOnly cookie-based sessions |
| **Role-Based Access** | Admin, Staff, Ministry Leader, Scheduler roles |
| **Granular Permissions** | `resource.action` permission keys on every endpoint |
| **Audit Logging** | Full audit trail of who did what and when |
| **Password Security** | bcrypt hashing, minimum complexity |
| **Rate Limiting** | API rate limiting on all routes |
| **Security Headers** | Helmet.js CSP, HSTS, and more |
| **Token Blacklist** | Immediate invalidation on logout |

---

## Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        direction LR
        A[React SPA<br/>localhost:5173]
        B[Kids Kiosk<br/>/kids-checkin/kiosk]
        C[Schedule Kiosk<br/>/kiosk/:token]
        D[Giving Portal<br/>/give]
    end

    subgraph Gateway["Express API — localhost:3001"]
        direction TB
        E[Auth Middleware<br/>requireAuth + requirePermission]
        F[Rate Limiter]
        G{Route Handlers}
    end

    subgraph Domains["Domain Modules"]
        direction LR
        H[Members &<br/>Households]
        I[Events &<br/>Check-In]
        J[Giving &<br/>Accounting]
        K[Worship &<br/>Scheduling]
        L[Communications]
        M[Reports &<br/>Analytics]
    end

    subgraph Data["Data Layer"]
        N[(PostgreSQL 16)]
        O[Prisma ORM<br/>Type-safe queries]
        P[Audit Log]
    end

    subgraph External["External Services"]
        Q[Stripe<br/>Payments]
        R[Email Provider<br/>SendGrid stub]
        S[SMS Provider<br/>Twilio stub]
    end

    A & B & C & D -->|HTTPS / Bearer JWT| E
    E --> F --> G
    G --> H & I & J & K & L & M
    H & I & J & K & L & M --> O
    O --> N
    O --> P
    J -->|Webhook| Q
    L -->|SMTP| R
    L -->|REST| S
```

<br/>

### Monorepo Layout

```mermaid
graph LR
    subgraph Root["StewardChMS/"]
        subgraph Frontend["frontend/"]
            F1[React + Vite]
            F2[pages/]
            F3[hooks/]
            F4[components/]
            F5[lib/api/]
        end
        subgraph Backend["backend/"]
            B1[Express Server]
            B2[src/routes/]
            B3[src/middleware/]
            B4[src/lib/]
            B5[prisma/schema]
        end
        subgraph Shared["shared/"]
            S1[Zod Schemas]
            S2[TypeScript Types]
        end
    end

    F5 -->|HTTP fetch| B1
    S1 -->|validate| F5
    S1 -->|validate| B2
```

---

## Data Model

```mermaid
erDiagram
    User {
        string id PK
        string email
        string passwordHash
        boolean isActive
    }
    Member {
        string id PK
        string firstName
        string lastName
        string email
        string status
    }
    Household {
        string id PK
        string name
    }
    HouseholdMember {
        string householdId FK
        string memberId FK
        string role
    }
    Ministry {
        string id PK
        string name
        boolean isActive
    }
    Group {
        string id PK
        string name
        string ministryId FK
    }
    Event {
        string id PK
        string title
        string type
        boolean isRecurring
    }
    EventOccurrence {
        string id PK
        string eventId FK
        datetime startsAt
    }
    CheckIn {
        string id PK
        string occurrenceId FK
        string memberId FK
        string securityCode
    }
    Donation {
        string id PK
        string memberId FK
        string fundId FK
        int amountCents
        string method
    }
    Fund {
        string id PK
        string name
        string type
    }
    Pledge {
        string id PK
        string memberId FK
        int totalCents
        int fulfilledCents
    }
    Song {
        string id PK
        string title
        string key
        int bpm
    }
    WorshipPlan {
        string id PK
        string occurrenceId FK
    }
    MinistryCalendar {
        string id PK
        string ministryId FK
        string shareToken
        int serviceDayOfWeek
    }
    SchedulePeriod {
        string id PK
        string calendarId FK
        int year
        int month
        string status
    }
    AuditLog {
        string id PK
        string actorUserId FK
        string action
        string entityType
    }

    Member ||--o{ HouseholdMember : "belongs to"
    Household ||--o{ HouseholdMember : "contains"
    Ministry ||--o{ Group : "has"
    Event ||--o{ EventOccurrence : "occurs as"
    EventOccurrence ||--o{ CheckIn : "has"
    Member ||--o{ CheckIn : "checks in"
    Member ||--o{ Donation : "gives"
    Fund ||--o{ Donation : "receives"
    Member ||--o{ Pledge : "pledges"
    EventOccurrence ||--o| WorshipPlan : "has"
    WorshipPlan ||--o{ Song : "includes"
    Ministry ||--o{ MinistryCalendar : "owns"
    MinistryCalendar ||--o{ SchedulePeriod : "has"
    User ||--o{ AuditLog : "generates"
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant React as React App
    participant Express as Express API
    participant Auth as Auth Middleware
    participant Route as Route Handler
    participant Prisma as Prisma ORM
    participant DB as PostgreSQL

    Browser->>React: User action
    React->>Express: POST /api/resource<br/>Cookie: steward_session=JWT
    Express->>Auth: requireAuth()
    Auth->>Auth: Verify JWT signature<br/>Extract userId + permissions
    Auth-->>Express: Authenticated
    Express->>Auth: requirePermission('resource.action')
    Auth-->>Route: Authorized
    Route->>Route: Validate body with Zod
    Route->>Prisma: prisma.model.create(data)
    Prisma->>DB: INSERT INTO ...
    DB-->>Prisma: Created record
    Prisma-->>Route: Typed result
    Route->>Prisma: createAuditLog(...)
    Route-->>Express: res.status(201).json(result)
    Express-->>React: 201 Created + JSON body
    React->>React: TanStack Query cache update
    React-->>Browser: UI update
```

---

## Auth and Permissions

```mermaid
flowchart TD
    Request([Incoming Request])
    IsPublic{Public route?}
    ReadCookie[Read steward_session cookie]
    VerifyJWT{Valid JWT?}
    ExtractClaims[Extract userId, roles, permissions]
    CheckPerm{Has required permission?}
    Handle[Route Handler]

    Request --> IsPublic
    IsPublic -->|Yes| Handle
    IsPublic -->|No| ReadCookie
    ReadCookie --> VerifyJWT
    VerifyJWT -->|Invalid| R401([401 Unauthorized])
    VerifyJWT -->|Valid| ExtractClaims
    ExtractClaims --> CheckPerm
    CheckPerm -->|No| R403([403 Forbidden])
    CheckPerm -->|Yes| Handle
    Handle --> Response([Response])
```

**Permission key format:** `resource.action`

| Permission | Access Level |
|-----------|-------------|
| `members.view` | Read member profiles |
| `members.edit` | Create and update members |
| `members.delete` | Delete members |
| `giving.view` | View donations and reports |
| `giving.manage` | Record and edit transactions |
| `accounting.manage` | Full accounting access |
| `events.manage` | Create and edit events |
| `schedules.view` | View ministry schedules |
| `schedules.manage` | Edit rotation calendars |
| `communications.send` | Send messages |
| `admin` | Full system access |

---

## Getting Started

### Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18+ | 20 LTS |
| PostgreSQL | 14+ | 16 |
| npm | 9+ | 10+ |
| Docker | Optional | 24+ |

---

### Option 1 — Local Setup

```bash
# Clone the repo
git clone https://github.com/24Skater/StewardChMS.git
cd StewardChMS

# Install all workspace dependencies
npm ci

# Configure the backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and JWT_SECRET
```

```bash
# Set up the database
npm run db:generate -w backend     # Generate Prisma client
npm run db:migrate -w backend      # Run schema migrations
npm run db:seed -w backend         # Seed admin user and sample data
```

```bash
# Start development servers
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:3001
```

---

### Option 2 — Docker Compose

```bash
# Start everything (PostgreSQL + backend + frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Edit `docker.env` before first run to set your database password and JWT secret.

---

### First Login

| Field | Value |
|-------|-------|
| URL | `http://localhost:5173` |
| Email | `admin@example.com` |
| Password | `admin123` |

> Change the admin password immediately in Admin → Settings before any real data entry.

---

### Public URLs — no login required

| Path | Purpose |
|------|---------|
| `/give` | Online giving portal (Stripe) |
| `/give/thank-you` | Post-donation confirmation |
| `/kids-checkin/kiosk` | Self-service kids check-in station |
| `/kiosk/:token` | Ministry schedule TV display |
| `/setup` | First-run setup wizard |

---

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/stewardchms
JWT_SECRET=<minimum-32-character-random-string>

# Optional
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_EXPIRES_IN=7d
NODE_ENV=development

# Stripe (for online giving)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Development

<img src="docs/assets/stack.svg" alt="Technology Stack" width="100%"/>

<br/>

### Commands

```bash
# Install
npm ci

# Run
npm run dev:frontend               # Frontend  http://localhost:5173
npm run dev:backend                # Backend   http://localhost:3001

# Quality
npm run typecheck                  # TypeScript across all workspaces
npm run lint                       # ESLint across all workspaces

# Test
npm test                           # All tests
npm run test -w frontend           # Frontend Vitest only
npm run test -w backend            # Backend Supertest integration tests

# Database
npm run db:generate -w backend     # Re-generate Prisma client
npm run db:migrate -w backend      # Create and apply migration
npm run db:seed -w backend         # Seed admin and demo data
npx prisma studio \
  --schema=backend/prisma/schema.prisma

# Build
npm run build -w shared            # Build shared schemas first
npm run build:frontend
npm run build:backend
```

---

### CI Pipeline

```mermaid
flowchart LR
    PR([Pull Request]) --> L & T & TC & SA

    L[Lint<br/>ESLint zero warnings]
    T[Test<br/>Vitest + Supertest<br/>Real PostgreSQL]
    TC[Typecheck<br/>tsc strict + prisma generate]
    SA[Security<br/>npm audit]

    L & TC --> B[Build<br/>Vite frontend<br/>TypeScript backend]
    T & SA --> B
    B --> Merge([Merge])
```

---

### Adding a New Feature Domain

```mermaid
flowchart TD
    A["1. Prisma model\nbackend/prisma/schema.prisma"] --> B
    B["2. Migration\nnpm run db:migrate -w backend"] --> C
    C["3. Zod schemas\nshared/src/schemas/"] --> D
    D["4. Route + tests\nbackend/src/routes/feature.ts"] --> E
    E["5. Register route\nbackend/src/app.ts"] --> F
    F["6. API hook\nfrontend/src/hooks/useFeature.ts"] --> G
    G["7. API functions\nfrontend/src/lib/api/feature.ts"] --> H
    H["8. Page components\nfrontend/src/pages/feature/"] --> I
    I["9. Register routes\nfrontend/src/App.tsx"] --> J
    J["10. Nav link\nfrontend/src/components/layout/AppLayout.tsx"]
```

---

### Project Structure

```
StewardChMS/
│
├── frontend/
│   ├── src/
│   │   ├── pages/               Route-level page components (by domain)
│   │   │   ├── members/
│   │   │   ├── events/
│   │   │   ├── giving/
│   │   │   ├── accounting/
│   │   │   ├── communications/
│   │   │   ├── schedules/
│   │   │   ├── kids-checkin/
│   │   │   ├── reports/
│   │   │   ├── songs/
│   │   │   ├── sales/
│   │   │   ├── groups/
│   │   │   └── admin/
│   │   ├── hooks/               TanStack Query hooks (one per domain)
│   │   ├── components/
│   │   │   ├── ui/              shadcn/ui primitives
│   │   │   ├── layout/          AppLayout, AppSidebar
│   │   │   └── ProtectedRoute
│   │   ├── lib/
│   │   │   ├── api/             Per-domain API functions
│   │   │   ├── icons/           SVG icon registry
│   │   │   ├── pdf.ts           jsPDF report generation
│   │   │   └── csv.ts           CSV export utilities
│   │   └── context/
│   │       ├── AuthContext      User session + JWT
│   │       └── ThemeContext     Light/dark mode
│   └── public/                  Static assets + brand SVGs
│
├── backend/
│   ├── src/
│   │   ├── routes/              One file per domain (35+ route files)
│   │   ├── middleware/
│   │   │   ├── auth.ts          requireAuth, requirePermission
│   │   │   └── rateLimiter.ts
│   │   └── lib/
│   │       ├── auth.ts          JWT sign/verify
│   │       ├── audit.ts         Audit log writer
│   │       ├── security.ts      bcrypt, token blacklist
│   │       └── prisma.ts        Prisma client singleton
│   └── prisma/
│       ├── schema.prisma        Single source of truth (42 models)
│       ├── migrations/          Version-controlled SQL migrations
│       └── seed.ts              Admin user + demo data
│
├── shared/
│   └── src/schemas/             Zod schemas shared by frontend + backend
│
├── docs/
│   ├── assets/                  README images and SVGs
│   └── superpowers/             Design specs and implementation plans
│
├── docker-compose.yml
├── docker.env
└── package.json                 Monorepo root (npm workspaces)
```

---

## Roadmap

### Shipped

- [x] Authentication, JWT sessions, RBAC
- [x] Member CRM and household management
- [x] CSV bulk import
- [x] Ministry and group hierarchy
- [x] Events and recurring occurrences
- [x] Kids self-service check-in kiosk
- [x] Label printing with allergy alerts
- [x] Worship song library and service planning
- [x] Email and SMS communication center with templates
- [x] Stripe online giving portal
- [x] Donation, pledge, and fund accounting
- [x] Expense, invoice, purchase order management
- [x] Vendor and payee management
- [x] Comprehensive reporting suite (PDF and CSV)
- [x] Financial dashboard with charts
- [x] Sales and inventory module
- [x] Admin settings and setup wizard
- [x] Ministry scheduling with TV kiosk view
- [x] Rotating volunteer calendar
- [x] Light/dark mode for all kiosk views
- [x] Audit logging across all mutations
- [x] CI/CD pipeline (lint, typecheck, test, build)

### Backlog

- [ ] Mobile-responsive PWA redesign
- [ ] Push notification provider integration
- [ ] Google and Apple Calendar export
- [ ] Multi-campus / multi-site support
- [ ] Volunteer scheduling with availability tracking
- [ ] Sermon notes and media library
- [ ] Background check integration
- [ ] Child birthday and milestone alerts
- [ ] Tithe tracking dashboard for members
- [ ] API webhooks for external integrations

---

## Contributing

All contributions are welcome — bug reports, feature requests, documentation, and code.

### Workflow

```bash
# Fork and clone
git clone https://github.com/<your-username>/StewardChMS.git

# Create a feature branch
git checkout -b feat/your-feature-name

# Write tests first (TDD)
# Tests live co-located with source: *.test.ts / *.test.tsx

# Implement
# Follow the conventions in CLAUDE.md

# Verify everything passes
npm run typecheck && npm run lint && npm test

# Commit using conventional format
git commit -m "feat: describe what your feature does"

# Open a pull request
# CI runs automatically; all checks must pass before merge
```

### Commit Convention

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `refactor:` | Code cleanup without behavior change |
| `docs:` | Documentation |
| `test:` | Test additions or corrections |
| `chore:` | Config, tooling, dependencies |
| `perf:` | Performance improvements |
| `ci:` | CI/CD changes |

### Code Standards

- TypeScript strict mode — no `any`, explicit return types on public APIs
- Zod validation at every API boundary
- Prisma for all database access — no raw SQL
- TDD preferred — write tests before implementation
- 80% test coverage minimum
- No hardcoded credentials — env vars only
- RBAC on every endpoint — use `requirePermission()`

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">
<br/>

### A Note on Purpose

**Steward ChMS** was built as an expression of faith in the Lord Jesus Christ.

The Church is called to steward people, time, and resources with integrity, excellence, and love.<br/>
This project exists to serve that calling — giving churches tools to care well for their communities<br/>
and operate with transparency and faithfulness.

<br/>

> *"Moreover it is required in stewards, that a man be found faithful."*<br/>
> — 1 Corinthians 4:2

<br/>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/steward-mark.svg">
  <source media="(prefers-color-scheme: light)" srcset="frontend/public/steward-mark-light.svg">
  <img alt="Steward" src="frontend/public/steward-mark.svg" width="25" height="32"/>
</picture>

<br/>

*Built with care for the Church — MIT Licensed — Open to all*

</div>
