You are building StewardChMS (standalone) using docs/spec.md as the source of truth.
Follow docs/cursor-rules.md.

PHASE 0: Project Initialization (Frontend + Backend skeleton)

Plan first, then implement.

Deliverables:
1) Initialize repo with:
   - Frontend: Vite + React + TS + React Router + Tailwind + shadcn/ui pattern
   - React Query configured
2) Backend skeleton:
   - Node + Express API server
   - Health endpoint: GET /api/health
3) Prisma + PostgreSQL:
   - Prisma setup + first migration
4) Tooling:
   - ESLint + TypeScript config
   - Basic test runner (Vitest for frontend, and Vitest or Jest for backend)
5) Docs:
   - Ensure docs/spec.md, docs/cursor-rules.md, docs/decisions.md, docs/prompts/* exist

Stop when:
- `npm run dev` starts frontend
- backend starts (separate script) and /api/health works
- migrations run successfully
- lint + typecheck + tests pass

End with:
- commands to run
- folder structure summary
- Phase 1 plan
