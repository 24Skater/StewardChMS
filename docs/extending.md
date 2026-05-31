# Extending StewardChMS: Adding a New Domain

This guide covers every step required to add a complete new feature domain to StewardChMS. The existing members, donations, and ministry scheduling features serve as reference examples throughout.

---

## Overview

A complete domain spans nine layers:

| Step | Layer | Key Files |
|------|-------|-----------|
| 1 | Prisma model | `backend/prisma/schema.prisma` |
| 2 | Migration | `backend/prisma/migrations/` |
| 3 | Shared Zod schemas | `shared/src/schemas/` |
| 4 | Backend route + tests | `backend/src/routes/` |
| 5 | Route registration | `backend/src/app.ts` |
| 6 | Permission keys | `backend/prisma/seed.ts` |
| 7 | Frontend API functions | `frontend/src/lib/api/` |
| 8 | Frontend hook | `frontend/src/hooks/` |
| 9 | Pages + routing | `frontend/src/pages/`, `App.tsx`, `AppLayout.tsx` |

---

## Step 1: Add the Prisma Model

Edit `backend/prisma/schema.prisma`. Key patterns in this codebase:

- Use `@id @default(cuid())` for primary keys
- Use `@map("snake_case")` on every field to keep column names snake_case while the Prisma client uses camelCase
- Use `@@map("table_name")` on the model for the SQL table name
- Use `@updatedAt` on the `updatedAt` field -- Prisma handles the timestamp automatically
- Add `@@index` for every field that is used in `findMany` `where` clauses
- Nullable optional fields use `?` after the Prisma type (e.g. `String?`)

```prisma
model ServiceNote {
  id          String   @id @default(cuid())
  title       String
  body        String?
  authorId    String   @map("author_id")
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@index([publishedAt])
  @@map("service_notes")
}
```

For enums, define them outside the model:

```prisma
enum ServiceNoteStatus {
  draft
  published
  archived
}
```

The complete Prisma schema pattern can be seen in `backend/prisma/schema.prisma`, for example the `Member` model (Phase 2) and `MinistryCalendar` model (Phase 7).

---

## Step 2: Create and Run the Migration

```bash
# From the repo root:
npm run db:generate -w backend   # regenerates Prisma client after schema edit
npm run db:migrate -w backend    # prompts for migration name, creates SQL file
```

The migration creates a file under `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.

**If migration fails:**

1. Confirm `DATABASE_URL` in `backend/.env` points to a running PostgreSQL 16 instance.
2. If the migration applied partially, run `npx prisma migrate resolve --rolled-back <name> -w backend`, fix the schema, then retry.
3. Never edit `migration.sql` files after they have been applied to a shared environment.

---

## Step 3: Add Zod Schemas to `shared/`

Create `shared/src/schemas/service-notes.ts`. Export every schema and its inferred type:

```typescript
import { z } from 'zod'

export const createServiceNoteSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  body:        z.string().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
})

export type CreateServiceNoteRequest = z.infer<typeof createServiceNoteSchema>

export const updateServiceNoteSchema = createServiceNoteSchema.partial()
export type UpdateServiceNoteRequest = z.infer<typeof updateServiceNoteSchema>

export const serviceNoteQuerySchema = z.object({
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export type ServiceNoteQuery = z.infer<typeof serviceNoteQuerySchema>
```

Then re-export from `shared/src/schemas/index.ts`:

```typescript
// at the end of shared/src/schemas/index.ts
export * from './service-notes.js'
```

Rebuild shared so backends and frontends can import it:

```bash
npm run build -w shared
```

---

## Step 4: Write the Backend Route File

Create `backend/src/routes/service-notes.ts`. The full CRUD template mirrors `backend/src/routes/members.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

// ============================================
// Zod Schemas (inline -- see CLAUDE.md note on shared build order)
// ============================================

const createSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  body:        z.string().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
})

const updateSchema = createSchema.partial()

const querySchema = z.object({
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// GET / -- List
// ============================================

router.get('/', requireAuth, requirePermission('notes.view'), async (req: Request, res: Response) => {
  try {
    const parseResult = querySchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parseResult.error.flatten().fieldErrors })
      return
    }
    const { page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const [notes, total] = await Promise.all([
      prisma.serviceNote.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.serviceNote.count(),
    ])

    res.json({ notes, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('List service notes error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// GET /:id -- Single
// ============================================

router.get('/:id', requireAuth, requirePermission('notes.view'), async (req: Request, res: Response) => {
  try {
    const note = await prisma.serviceNote.findUnique({ where: { id: req.params.id } })
    if (!note) {
      res.status(404).json({ error: 'Service note not found' })
      return
    }
    res.json(note)
  } catch (error) {
    console.error('Get service note error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// POST / -- Create
// ============================================

router.post('/', requireAuth, requirePermission('notes.edit'), async (req: Request, res: Response) => {
  try {
    const parseResult = createSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors })
      return
    }
    const data = parseResult.data
    const note = await prisma.serviceNote.create({
      data: {
        title: data.title,
        body: data.body ?? null,
        authorId: req.user!.userId,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    })
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SERVICE_NOTE_CREATED',
      entityType: 'ServiceNote',
      entityId: note.id,
      metadata: { title: note.title },
    })
    res.status(201).json(note)
  } catch (error) {
    console.error('Create service note error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUT /:id -- Update
// ============================================

router.put('/:id', requireAuth, requirePermission('notes.edit'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.serviceNote.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ error: 'Service note not found' })
      return
    }
    const parseResult = updateSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors })
      return
    }
    const note = await prisma.serviceNote.update({ where: { id: req.params.id }, data: parseResult.data })
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SERVICE_NOTE_UPDATED',
      entityType: 'ServiceNote',
      entityId: note.id,
      metadata: { changes: Object.keys(parseResult.data) },
    })
    res.json(note)
  } catch (error) {
    console.error('Update service note error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// DELETE /:id
// ============================================

router.delete('/:id', requireAuth, requirePermission('notes.edit'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.serviceNote.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      res.status(404).json({ error: 'Service note not found' })
      return
    }
    await prisma.serviceNote.delete({ where: { id: req.params.id } })
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'SERVICE_NOTE_DELETED',
      entityType: 'ServiceNote',
      entityId: req.params.id,
      metadata: { title: existing.title },
    })
    res.json({ message: 'Service note deleted successfully' })
  } catch (error) {
    console.error('Delete service note error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
```

---

### Test file

Create `backend/src/routes/service-notes.test.ts`. The test pattern uses `describeWithDb` -- a conditional `describe` that skips all tests when `DATABASE_URL` is not set. This means tests can run in CI against a real database without requiring local setup.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app.js'
import { signToken } from '../lib/auth.js'

const DATABASE_URL = process.env.DATABASE_URL
let prisma: PrismaClient | null = null

if (DATABASE_URL) {
  prisma = new PrismaClient()
}

// Mint a test token with the relevant permissions.
// The userId does not need to match a real DB row because
// createAuditLog silently swallows failures for unknown actors.
const adminToken = signToken({
  userId: 'test-user-id',
  email: 'test@example.com',
  roles: ['admin'],
  permissions: ['notes.view', 'notes.edit'],
}).accessToken

const viewerToken = signToken({
  userId: 'test-viewer-id',
  email: 'viewer@example.com',
  roles: ['staff'],
  permissions: ['notes.view'],
}).accessToken

// Skip all tests when DATABASE_URL is not configured
const describeWithDb = DATABASE_URL ? describe : describe.skip

describeWithDb('Service Notes API', () => {
  let createdId: string

  afterAll(async () => {
    if (!prisma) return
    // Clean up test data by a known property
    await prisma.serviceNote.deleteMany({ where: { title: { contains: '[test]' } } })
    await prisma.()
  })

  describe('POST /api/service-notes', () => {
    it('creates a note with valid data', async () => {
      const res = await request(app)
        .post('/api/service-notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '[test] First note', body: 'Hello world' })

      expect(res.status).toBe(201)
      expect(res.body.title).toBe('[test] First note')
      expect(res.body.id).toBeDefined()
      createdId = res.body.id
    })

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/service-notes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'No title' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
      expect(res.body.details.title).toBeDefined()
    })

    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post('/api/service-notes')
        .send({ title: '[test] Unauthorized' })
      expect(res.status).toBe(401)
    })

    it('returns 403 when missing notes.edit permission', async () => {
      const res = await request(app)
        .post('/api/service-notes')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: '[test] Forbidden' })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/service-notes', () => {
    it('returns a list of notes', async () => {
      const res = await request(app)
        .get('/api/service-notes')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.notes)).toBe(true)
      expect(typeof res.body.total).toBe('number')
    })
  })

  describe('GET /api/service-notes/:id', () => {
    it('returns 404 for a non-existent id', async () => {
      const res = await request(app)
        .get('/api/service-notes/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/service-notes/:id', () => {
    it('deletes the created note', async () => {
      const res = await request(app)
        .delete(`/api/service-notes/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.message).toContain('deleted')
    })
  })
})
```

**TDD approach:** Write the test file first, run `npm run test -w backend` and confirm the tests fail with a 404 (route not yet registered), then implement the route, then confirm tests pass.

---

## Step 5: Register the Route in `app.ts`

Edit `backend/src/app.ts`. Add the import at the top with other route imports, then mount it:

```typescript
// At the top -- add with other route imports
import serviceNotesRouter from './routes/service-notes.js'

// In the routes section -- add a descriptive comment grouping routes by phase
app.use('/api/service-notes', serviceNotesRouter)
```

Routes with nested paths (e.g. `/api/occurrences/:id/registrations`) are mounted at `/api` and handle the full path in the router itself:

```typescript
app.use('/api', serviceNotesRouter)  // only if your route uses nested paths like /occurrences/:id/notes
```

---

## Step 6: Add Permission Keys

Edit `backend/prisma/seed.ts`. Add entries to the `DEFAULT_PERMISSIONS` array:

```typescript
// In DEFAULT_PERMISSIONS array:
{ key: 'notes.view',  description: 'View service notes' },
{ key: 'notes.edit',  description: 'Create, update, and delete service notes' },
```

**Naming convention:** `<resource>.<action>` using these standard actions:

| Action | Meaning | Example |
|--------|---------|--------|
| `view` | Read access | `notes.view`, `giving.view` |
| `edit` | Write access (create + update + delete) | `notes.edit`, `giving.edit` |
| `read` | Read access (older pattern) | `members.read` |
| `write` | Write access (older pattern) | `members.write` |
| `delete` | Explicit delete permission (used when delete is more sensitive than edit) | `members.delete` |
| `manage` | Full CRUD + admin operations | `schedules.manage` |

After editing `seed.ts`, re-run the seed to insert the new permissions into the database:

```bash
npm run db:seed -w backend
```

The seed uses upsert logic so re-running it is safe and idempotent.

To assign new permissions to an existing role, add the key to the relevant role's permission array in `seed.ts` and re-run the seed.

---

## Step 7: Write Frontend API Functions

Create `frontend/src/lib/api/service-notes.ts`. Import `apiRequest` from `@/lib/api`.

```typescript
import { apiRequest } from '@/lib/api'

export interface ServiceNote {
  id: string
  title: string
  body: string | null
  authorId: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ServiceNoteListResponse {
  notes: ServiceNote[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateServiceNoteData {
  title: string
  body?: string | null
  publishedAt?: string | null
}

export function getServiceNotes(params: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.page)  qs.set('page',  String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  const q = qs.toString() ? '?' + qs.toString() : ''
  return apiRequest<ServiceNoteListResponse>('/service-notes' + q)
}

export function getServiceNote(id: string) {
  return apiRequest<ServiceNote>('/service-notes/' + id)
}

export function createServiceNote(data: CreateServiceNoteData) {
  return apiRequest<ServiceNote>('/service-notes', { method: 'POST', body: data })
}

export function updateServiceNote(id: string, data: Partial<CreateServiceNoteData>) {
  return apiRequest<ServiceNote>('/service-notes/' + id, { method: 'PUT', body: data })
}

export function deleteServiceNote(id: string) {
  return apiRequest<{ message: string }>('/service-notes/' + id, { method: 'DELETE' })
}
```

The existing frontend/src/lib/api.ts file is 1,986 lines of known technical debt. New domains should always create a separate file under frontend/src/lib/api/<domain>.ts rather than adding to the monolith. The schedules.ts file in that directory is the canonical example.

---
## Step 8: Write the Frontend Hook

Create `frontend/src/hooks/useServiceNotes.ts`. The pattern mirrors `useMembers.ts` and `useSchedules.ts`.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getServiceNotes,
  getServiceNote,
  createServiceNote,
  updateServiceNote,
  deleteServiceNote,
  ServiceNoteListResponse,
  ServiceNote,
  CreateServiceNoteData,
} from '@/lib/api/service-notes'
import { ApiClientError } from '@/lib/api'

// ============================================
// Query Keys
// ============================================
// A structured key factory ensures related queries are invalidated together.
// The pattern is: all -> lists -> list(params) -> details -> detail(id)

export const serviceNoteKeys = {
  all:     ['service-notes'] as const,
  lists:   () => [...serviceNoteKeys.all, 'list'] as const,
  list:    (params: object) => [...serviceNoteKeys.lists(), params] as const,
  details: () => [...serviceNoteKeys.all, 'detail'] as const,
  detail:  (id: string) => [...serviceNoteKeys.details(), id] as const,
}

// ============================================
// Queries
// ============================================

export function useServiceNotes(params: { page?: number; limit?: number } = {}) {
  return useQuery<ServiceNoteListResponse, ApiClientError>({
    queryKey: serviceNoteKeys.list(params),
    queryFn:  () => getServiceNotes(params),
  })
}

export function useServiceNote(id: string) {
  return useQuery<ServiceNote, ApiClientError>({
    queryKey: serviceNoteKeys.detail(id),
    queryFn:  () => getServiceNote(id),
    enabled:  !!id,
  })
}

// ============================================
// Mutations
// ============================================

export function useCreateServiceNote() {
  const qc = useQueryClient()
  return useMutation<ServiceNote, ApiClientError, CreateServiceNoteData>({
    mutationFn: createServiceNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serviceNoteKeys.lists() })
    },
  })
}

export function useUpdateServiceNote() {
  const qc = useQueryClient()
  return useMutation<ServiceNote, ApiClientError, { id: string; data: Partial<CreateServiceNoteData> }>({
    mutationFn: ({ id, data }) => updateServiceNote(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: serviceNoteKeys.detail(id) })
      qc.invalidateQueries({ queryKey: serviceNoteKeys.lists() })
    },
  })
}

export function useDeleteServiceNote() {
  const qc = useQueryClient()
  return useMutation<{ message: string }, ApiClientError, string>({
    mutationFn: deleteServiceNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serviceNoteKeys.lists() })
    },
  })
}
```

---
## Step 9: Build Page Components

### File structure

Create a subdirectory under `frontend/src/pages/` named after the domain in kebab-case:


```
frontend/src/pages/service-notes/
  ServiceNotesPage.tsx       -- list view
  ServiceNoteFormPage.tsx    -- create / edit form
  ServiceNoteDetailPage.tsx  -- detail/read view (optional)
```


**Naming conventions:**

| File | Convention | Example |
|------|-----------|---------|
| Directory | kebab-case | `service-notes/` |
| Component files | PascalCase + `Page.tsx` suffix | `ServiceNotesPage.tsx` |
| Non-page components | PascalCase + `.tsx` | `ServiceNoteCard.tsx` |
| Hooks | camelCase + `use` prefix | `useServiceNotes.ts` |
| API files | kebab-case | `service-notes.ts` |

### List page template

```typescript
import { Link } from 'react-router-dom'
import { useServiceNotes, useDeleteServiceNote } from '@/hooks/useServiceNotes'

export default function ServiceNotesPage() {
  const { data, isLoading, error } = useServiceNotes()
  const deleteMutation = useDeleteServiceNote()

  if (isLoading) return <div>Loading...</div>
  if (error)     return <div>Error: {error.message}</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Service Notes</h1>
        <Link to="/service-notes/new">New Note</Link>
      </div>
      <ul>
        {data?.notes.map(note => (
          <li key={note.id}>
            <Link to={'/service-notes/' + note.id + '/edit'}>{note.title}</Link>
            <button onClick={() => deleteMutation.mutate(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Form page template

```typescript
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useServiceNote, useCreateServiceNote, useUpdateServiceNote } from '@/hooks/useServiceNotes'
import { ApiClientError } from '@/lib/api'

interface FormValues {
  title: string
  body: string
}

export default function ServiceNoteFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: existing } = useServiceNote(id ?? '')

  const createMutation = useCreateServiceNote()
  const updateMutation = useUpdateServiceNote()

  const form = useForm<FormValues>({
    defaultValues: {
      title: existing?.title ?? '',
      body:  existing?.body  ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: values })
      } else {
        await createMutation.mutateAsync(values)
      }
      navigate('/service-notes')
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 400 && err.data.details) {
        Object.entries(err.data.details).forEach(([field, messages]) => {
          form.setError(field as keyof FormValues, { message: (messages as string[])[0] })
        })
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('title')} placeholder="Title" />
      {form.formState.errors.title && <span>{form.formState.errors.title.message}</span>}
      <textarea {...form.register('body')} placeholder="Body" />
      <button type="submit">{isEdit ? 'Save' : 'Create'}</button>
    </form>
  )
}
```

---

## Step 9b: Register Routes in App.tsx

Edit `frontend/src/App.tsx`. Add imports at the top and <Route> elements inside the protected route block:

```typescript
// 1. Add imports with the other page imports at the top
import ServiceNotesPage     from './pages/service-notes/ServiceNotesPage'
import ServiceNoteFormPage  from './pages/service-notes/ServiceNoteFormPage'

// 2. Add routes inside the <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}> block
<Route path="/service-notes"          element={<ServiceNotesPage />} />
<Route path="/service-notes/new"      element={<ServiceNoteFormPage />} />
<Route path="/service-notes/:id/edit" element={<ServiceNoteFormPage />} />
```

---

## Step 9c: Add Navigation in AppLayout.tsx

Edit `frontend/src/components/layout/AppLayout.tsx`. Add an entry to the `navSections` array. Choose an existing section or create a new one:

```typescript
// In the appropriate section inside navSections:
{ label: 'Service Notes', href: '/service-notes', icon: 'notes' },
```

The `icon` value must be a key registered in `frontend/src/lib/icons/registry.ts`. If the icon does not yet exist, add it there first.

---
## Naming Conventions Reference

| Concern | Convention | Examples |
|---------|-----------|---------|
| Route files | kebab-case | `service-notes.ts`, `ministry-calendars.ts` |
| Test files | co-located, same name + `.test.ts` | `service-notes.test.ts` |
| Page component files | PascalCase + `Page` suffix | `ServiceNotesPage.tsx`, `ServiceNoteFormPage.tsx` |
| Reusable components | PascalCase | `ServiceNoteCard.tsx` |
| Hook files | camelCase + `use` prefix | `useServiceNotes.ts` |
| API module files | kebab-case | `service-notes.ts` |
| Shared schema files | kebab-case | `service-notes.ts` |
| Permission keys | `resource.action` dot notation | `notes.view`, `notes.edit` |
| Audit action strings | SCREAMING_SNAKE_CASE | `SERVICE_NOTE_CREATED` |
| Prisma model fields | camelCase in schema, snake_case in DB via `@map` | `authorId` / `author_id` |

---

## The Audit Logging Pattern

Call `createAuditLog` after every successful write operation. The function signature:

```typescript
interface AuditLogData {
  actorUserId?: string | null  // req.user?.userId -- null for system/anonymous actions
  action: string               // SCREAMING_SNAKE_CASE verb, e.g. SERVICE_NOTE_CREATED
  entityType: string           // PascalCase model name, e.g. ServiceNote
  entityId?: string | null     // the affected record's id
  metadata?: Record<string, any>  // any contextual data -- avoid PII
}
```

**Key behaviors:**

- `createAuditLog` is fire-and-forget from the caller's perspective. It wraps its own Prisma call in `try/catch` and logs failures with `console.error` without rethrowing. This means a failed audit log never fails the HTTP request.
- `await` the call anyway (as all existing routes do) so the audit record is written before the response is sent, which avoids a race condition on fast test teardowns.
- The `actorUserId` foreign key points to the `users` table. If the userId does not exist (e.g. in tests with synthetic tokens), the insert fails silently.
- In tests, use `test-user-id` as the userId in minted tokens; `createAuditLog` will fail silently without affecting test assertions.

```typescript
// Correct pattern -- always await, always pass req.user?.userId
await createAuditLog({
  actorUserId: req.user?.userId,
  action:      'SERVICE_NOTE_DELETED',
  entityType:  'ServiceNote',
  entityId:    req.params.id,
  metadata:    { title: existing.title },
})
```

---

## Integration Test Patterns

### The `describeWithDb` pattern

```typescript
const DATABASE_URL = process.env.DATABASE_URL
let prisma: PrismaClient | null = null

if (DATABASE_URL) {
  prisma = new PrismaClient()
}

// Skips the entire suite when DATABASE_URL is not set.
// In CI, DATABASE_URL is set and tests run against a real PostgreSQL instance.
const describeWithDb = DATABASE_URL ? describe : describe.skip
```

### Token minting

Mint tokens with `signToken` from `backend/src/lib/auth.js`. The userId does not need to match a real database row for most tests (`createAuditLog` swallows the foreign key failure):

```typescript
const adminToken = signToken({
  userId:      'test-user-id',
  email:       'test@example.com',
  roles:       ['admin'],
  permissions: ['notes.view', 'notes.edit'],
}).accessToken

const viewerToken = signToken({
  userId:      'test-viewer-id',
  email:       'viewer@example.com',
  roles:       ['viewer'],
  permissions: ['notes.view'],
}).accessToken
```

### Cleanup

Use `afterAll` to delete test data. Use a pattern that identifies test records by a known property rather than individual IDs, because test creation may partially succeed:

```typescript
afterAll(async () => {
  if (!prisma) return
  await prisma.serviceNote.deleteMany({ where: { title: { contains: '[test]' } } })
  await prisma.$disconnect()
})
```

### Testing permission boundaries

Always include these four test cases for each protected endpoint:

1. 201 / 200 with a valid token that has the required permission
2. 400 with a valid token but invalid input
3. 401 with no token
4. 403 with a valid token that is missing the required permission

---

## Checklist for a New Domain

Use this before opening a pull request:

- [ ] Prisma model added with `@id`, `@map`, `@@map`, `@@index`, `@updatedAt`
- [ ] Migration created and applied locally
- [ ] Shared Zod schemas added to `shared/src/schemas/<domain>.ts` and re-exported from `index.ts`
- [ ] `npm run build -w shared` passes
- [ ] Backend route file created following the CRUD template
- [ ] All five handler types covered: GET list, GET single, POST, PUT, DELETE
- [ ] Every handler: validates input with `safeParse`, checks existence before 404s, returns after every `res.json` call
- [ ] Audit logs added after every successful write
- [ ] Test file created with `describeWithDb`, auth boundary tests, and `afterAll` cleanup
- [ ] `npm run test -w backend` passes
- [ ] Route registered in `backend/src/app.ts`
- [ ] Permission keys added to `DEFAULT_PERMISSIONS` in `seed.ts` and re-seeded
- [ ] Frontend API module created in `frontend/src/lib/api/<domain>.ts`
- [ ] Frontend hook created in `frontend/src/hooks/use<Domain>.ts` with structured query keys
- [ ] Page components created in `frontend/src/pages/<domain>/`
- [ ] Routes registered in `frontend/src/App.tsx`
- [ ] Nav item added to `navSections` in `frontend/src/components/layout/AppLayout.tsx`
- [ ] `npm run build:frontend` passes
