# StewardChMS Documentation

This directory contains the complete technical reference for StewardChMS. If you are new to the codebase, read in this order:

1. [Architecture](architecture.md) — how the system is structured and why
2. [Auth & Permissions](auth-permissions.md) — JWT, RBAC, permission keys
3. [Frontend Guide](frontend-guide.md) — React patterns, hooks, API layer, theme system
4. [Extending the System](extending.md) — how to add a new feature domain end-to-end
5. [API Errors](api-errors.md) — every error code, response shape, and how to handle them

---

## Reference Guides

| Document | What it covers |
|----------|----------------|
| [architecture.md](architecture.md) | System overview, request lifecycle, workspace dependency model, key architectural decisions |
| [auth-permissions.md](auth-permissions.md) | Login flow, JWT payload, `requireAuth`, `requirePermission`, all permission keys, token blacklist |
| [api-errors.md](api-errors.md) | HTTP status conventions, error envelopes, Zod validation shapes, rate limiting, Prisma error handling |
| [database-schema.md](database-schema.md) | All Prisma models grouped by domain, field descriptions, relations, migration workflow |
| [frontend-guide.md](frontend-guide.md) | Routing, TanStack Query, API layer, forms, icon system, theme/kiosk modes, testing |
| [extending.md](extending.md) | 10-step guide to adding a new domain: Prisma → migration → Zod → route → frontend hook → pages |
| [deployment.md](deployment.md) | Local setup, Docker Compose, production checklist, Stripe integration, security hardening |

---

## Domain References

Each domain document covers: concepts, all API endpoints (method, path, permission, request/response shapes, errors), data models, frontend pages, and extension points.

| Domain | Document |
|--------|----------|
| Members & Households | [domains/members.md](domains/members.md) |
| Events, Check-In & Kids Kiosk | [domains/events-checkin.md](domains/events-checkin.md) |
| Giving & Accounting | [domains/giving-accounting.md](domains/giving-accounting.md) |
| Ministry Scheduling | [domains/scheduling.md](domains/scheduling.md) |
| Worship Planning | [domains/worship.md](domains/worship.md) |
| Communication Center | [domains/communications.md](domains/communications.md) |
| Reports & Analytics | [domains/reports.md](domains/reports.md) |
| Sales & Inventory | [domains/sales-inventory.md](domains/sales-inventory.md) |
| Admin, Settings & Setup | [domains/admin-settings.md](domains/admin-settings.md) |

---

## Design Artifacts

| Document | What it covers |
|----------|----------------|
| [decisions.md](decisions.md) | Architecture decision log |
| [spec.md](spec.md) | Original system specification |

Plans and specs from the AI-assisted development process live in [superpowers/](superpowers/).
