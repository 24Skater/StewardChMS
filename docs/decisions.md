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