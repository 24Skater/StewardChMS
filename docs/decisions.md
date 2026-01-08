# StewardChMS – Decisions Log

Record decisions made during development so changes stay consistent.

Template:
- Date:
- Decision:
- Reason:
- Alternatives considered:
- Impact:

---

## Phase 0 Decisions

### Decision 1: Monorepo Structure
- Date: 2026-01-08
- Decision: Use npm workspaces with `frontend/`, `backend/`, `shared/` directories
- Reason: Clear separation of concerns while allowing shared code. Aligns with the README structure expectation.
- Alternatives considered: Single package, Turborepo, pnpm workspaces
- Impact: All packages can be installed with single `npm install` at root

### Decision 2: Test Runner
- Date: 2026-01-08
- Decision: Use Vitest for both frontend and backend testing
- Reason: Consistency across packages, excellent TypeScript support, fast execution, Vite-native for frontend
- Alternatives considered: Jest (heavier setup, slower), separate runners for each package
- Impact: Unified testing experience, shared configuration patterns

### Decision 3: Port Configuration
- Date: 2026-01-08
- Decision: Frontend on port 5173 (Vite default), Backend on port 3001
- Reason: Standard Vite port, avoids conflict with common ports (3000, 8080)
- Alternatives considered: Both on same port with proxy (more complex setup)
- Impact: Simple development setup with Vite proxy for API calls

### Decision 4: Prisma Location
- Date: 2026-01-08
- Decision: Prisma schema located in `backend/prisma/`
- Reason: Database is managed by backend, keeps schema close to server code
- Alternatives considered: Root-level prisma folder
- Impact: Backend owns database schema and migrations

---

## Phase 1 Decisions

### Decision 5: JWT Token Storage
- Date: 2026-01-08
- Decision: Store JWT in localStorage on frontend
- Reason: Simplicity for Phase 1; httpOnly cookies require additional backend configuration
- Alternatives considered: httpOnly cookies (more secure but requires cookie-parser, CSRF protection)
- Impact: Token accessible to JavaScript (XSS vulnerability acknowledged in code comments). Should revisit for production.

### Decision 6: Logout Strategy
- Date: 2026-01-08
- Decision: Stateless logout - client deletes token, no server-side blacklist
- Reason: Simplicity, aligns with JWT philosophy; token expiration provides eventual invalidation
- Alternatives considered: Token blacklist table (adds database load), refresh tokens (more complex)
- Impact: Tokens remain valid until expiration even after logout. Acceptable for church management use case.

### Decision 7: Password Hashing
- Date: 2026-01-08
- Decision: bcryptjs with 12 salt rounds
- Reason: Industry standard, good security/performance balance
- Alternatives considered: Argon2 (newer but less ecosystem support), bcrypt native (build issues on some platforms)
- Impact: Secure password storage, ~300ms hash time acceptable for auth operations

### Decision 8: Audit Logging
- Date: 2026-01-08
- Decision: Log successful logins, failed login attempts (without passwords), and logouts
- Reason: Security audit trail required; passwords must never be logged
- Alternatives considered: Logging all API calls (too verbose for Phase 1)
- Impact: AuditLog table will grow; consider retention policy in future phases

### Decision 9: RBAC Model
- Date: 2026-01-08
- Decision: User -> Role -> Permission three-tier model with many-to-many relationships
- Reason: Flexible permission system that matches spec requirements; allows granular access control
- Alternatives considered: Simple user.role field (too limited), attribute-based access control (over-engineered)
- Impact: Permissions checked via JWT claims, refreshed on login

---

## Phase 2 Decisions

### Decision 10: Member Soft Delete
- Date: 2026-01-08
- Decision: Deleting a member sets status to 'inactive' rather than hard delete
- Reason: Preserves data integrity, maintains audit history, allows recovery; members may have historical relationships
- Alternatives considered: Hard delete with CASCADE (loses history), archive table (more complex)
- Impact: 'Deleted' members still exist in database; filters should exclude inactive by default

### Decision 11: Member Notes Permission
- Date: 2026-01-08
- Decision: Separate `members.notes` permission required to view/edit the notes field
- Reason: Notes may contain sensitive pastoral information; not all staff should access them
- Alternatives considered: Single `members.write` for all fields (too permissive), per-field permissions (over-engineered)
- Impact: Notes field excluded from API response unless user has permission; requires permission check on updates

### Decision 12: CSV Import Processing
- Date: 2026-01-08
- Decision: Synchronous processing with 1000 row limit, inline validation errors
- Reason: Simplicity for Phase 2; async processing with job queue adds significant complexity
- Alternatives considered: Background jobs with status polling (better for large imports), streaming processing
- Impact: Import blocks until complete; large imports may timeout. Revisit if larger imports needed.

### Decision 13: Household-Member Relationship
- Date: 2026-01-08
- Decision: Many-to-many through HouseholdMember join table with relationshipType enum
- Reason: Members can belong to multiple households; relationship context (parent, child, spouse) is important
- Alternatives considered: Single household per member (too restrictive), self-referential family tree (more complex)
- Impact: Flexible family structures supported; queries need to join through HouseholdMember table

---

## Phase 3 Decisions

### Decision 14: Recurrence Rule Storage
- Date: 2026-01-08
- Decision: Store recurrence rules as JSON string in Event.recurrenceRule field
- Reason: Simple format that supports weekly and monthly patterns; easily parseable on both client and server
- Format: `{"frequency": "weekly", "dayOfWeek": 0}` or `{"frequency": "monthly", "weekOfMonth": 1, "dayOfWeek": 1}`
- Alternatives considered: iCal RRULE format (more complex parsing), separate columns per rule type (less flexible)
- Impact: Limited to weekly/monthly patterns; can extend JSON schema for more complex rules later

### Decision 15: Occurrence Generation Strategy
- Date: 2026-01-08
- Decision: Generate occurrences on-demand via API endpoint, not automatically on event creation
- Reason: Explicit control over when occurrences are created; prevents cluttering database with far-future dates
- Alternatives considered: Auto-generate on event create/update (harder to control), cron job (requires scheduler)
- Impact: User must explicitly generate occurrences; default to 90 days ahead; duplicates prevented by unique constraint

### Decision 16: Worship Plan Item Reordering
- Date: 2026-01-08
- Decision: Reorder by sending full ordered list to dedicated /reorder endpoint
- Reason: Atomic update of all positions; simpler than individual up/down operations at API level
- Alternatives considered: Individual move up/down endpoints (more network calls), drag-drop with optimistic UI only
- Impact: Frontend tracks order locally, sends batch update; sortOrder column determines display order

### Decision 17: Registration vs Check-In Model
- Date: 2026-01-08
- Decision: Separate Registration and CheckIn models; registrations can exist without check-ins
- Reason: Pre-registration and actual attendance are distinct concepts; enables registration forecasting
- Alternatives considered: Single attendance record with registered_at and checked_in_at timestamps (conflates concepts)
- Impact: Two separate tables to query; useful for capacity planning vs actual attendance reports

---

## Phase 4 Decisions

### Decision 18: Message Provider Abstraction
- Date: 2026-01-08
- Decision: Create provider interface with stub implementations that log to console
- Reason: Allows development/testing without real email/SMS services; easy to swap in real providers later
- Alternatives considered: Mock providers that return success only (no visibility), real providers from start (cost, complexity)
- Impact: Messages appear in server console during development; production requires implementing real providers (SendGrid, Twilio)

### Decision 19: Async Message Delivery
- Date: 2026-01-08
- Decision: Message creation returns immediately; delivery processes asynchronously with setTimeout simulation
- Reason: Don't block HTTP request while sending to many recipients; provides responsive UX
- Alternatives considered: Blocking synchronous send (slow for many recipients), Redis queue/workers (adds infrastructure)
- Impact: Delivery status updates after initial creation; frontend polls for status via useMessageStats hook

### Decision 20: Opt-In Default Behavior
- Date: 2026-01-08
- Decision: Members default to opted-in for both email and SMS if no explicit preference exists
- Reason: Common pattern for church communications; members can opt out as needed
- Alternatives considered: Default to opted-out (requires explicit opt-in, reduces reach), per-member default setting
- Impact: OptInPreference records only created when member changes from default; absence means opted-in

### Decision 21: Message Target Types
- Date: 2026-01-08
- Decision: Support three target types: all active members, members by status, explicit member IDs
- Reason: Covers common use cases; groups/tags/ministries targeting deferred to Phase 9 when Groups module exists
- Alternatives considered: Full targeting grammar (over-engineered), only explicit IDs (too manual)
- Impact: Limited targeting options until Groups module; explicit member selection works for small lists

### Decision 22: Variable Substitution
- Date: 2026-01-08
- Decision: Simple {{variable}} replacement for firstName, lastName, email
- Reason: Covers most personalization needs; easy to implement without template engine
- Alternatives considered: Full template engine like Handlebars (overkill), no personalization (poor UX)
- Impact: Limited to predefined variables; extend by adding more replacements if needed