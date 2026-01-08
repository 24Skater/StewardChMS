PHASE 1: Authentication + RBAC

Follow docs/spec.md exactly. Follow docs/cursor-rules.md.

Plan first, then implement.

Deliverables:
- Prisma models: User, Role, Permission, RolePermission, UserRole, AuditLog
- Auth endpoints:
  - POST /api/auth/register (admin only, or seed-only if preferred)
  - POST /api/auth/login
  - POST /api/auth/logout (token invalidation strategy documented)
  - GET /api/auth/me
- RBAC middleware:
  - requireAuth
  - requirePermission("...")
- Seed initial admin user (from env vars)
- Minimal UI:
  - Login page
  - Protected route example (admin dashboard placeholder)
- Tests:
  - password hashing
  - permission guard behavior

Stop when everything builds, migrations pass, tests pass.
Provide Phase 2 plan.
