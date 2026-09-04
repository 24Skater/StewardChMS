# API Error Reference

This document covers every error pattern in the StewardChMS backend API. It is the primary reference for contributors writing new routes or frontend code that consumes the API.

---

## Error Envelope

Every non-2xx response uses the same JSON envelope:

```typescript
{
  error: string          // always present -- human-readable message
  message?: string       // present on some 403 responses
  details?: object       // present on validation failures
}
```

Defined in `shared/src/schemas/index.ts`:

```typescript
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
})
```

The frontend `ApiClientError` class in `frontend/src/lib/api.ts` wraps every non-2xx response:

```typescript
export class ApiClientError extends Error {
  status: number
  data: ApiError

  constructor(status: number, data: ApiError) {
    super(data.error || 'API Error')
    this.status = status
    this.data = data
  }
}
```

---

## Success Status Codes

| Code | When Used | Body |
|------|-----------|------|
|  | GET requests, PUT updates, soft deletes, POST logout/change-password | Resource object or  |
|  | POST that creates a new resource | The newly created resource object |
|  | Not currently used -- deletes return  with  | -- |

### 200 example -- list response

```json
{
  "members": [],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### 201 example -- created resource

```json
{
  "id": "clxyz123abc",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "status": "active",
  "createdAt": "2026-05-30T12:00:00.000Z",
  "updatedAt": "2026-05-30T12:00:00.000Z"
}
```

### 200 example -- action response (delete / logout)

```json
{ "message": "Member deleted successfully" }
```

---

## 400 Bad Request

### When it fires

- Body or query params fail Zod schema validation
- Batch import payload is not an array, or exceeds the 1,000-record limit
- A referenced foreign key (e.g. `memberId`, `fundId`) does not exist in the database (treated as a client input error in routes such as `donations.ts`)

### Response shape

```json
{
  "error": "Validation failed",
  "details": {
    "lastName": ["Last name is required"],
    "email": ["Invalid email"]
  }
}
```

The `details` object comes directly from Zod's `error.flatten().fieldErrors`. Each key is a field name; each value is an array of error strings.

### Zod `flatten()` in depth

Given this schema and invalid input:

```typescript
const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName:  z.string().min(1, 'Last name is required').max(100),
  email:     z.string().email('Invalid email').nullable().optional(),
  status:    z.enum(['active', 'inactive', 'visitor']).optional().default('active'),
})

// Input sent: { "firstName": "", "email": "not-an-email" }
// -- lastName is missing entirely
```

`parseResult.error.flatten().fieldErrors` produces:

```json
{
  "firstName": ["First name is required"],
  "lastName": ["Last name is required"],
  "email": ["Invalid email"]
}
```

Root-level (non-field) errors appear under `_errors`:

```json
{
  "_errors": ["At least one field is required"],
  "firstName": []
}
```

### Client action

Read `error.data.details` and map field names to form validation messages.

```typescript
if (err instanceof ApiClientError && err.status === 400 && err.data.details) {
  Object.entries(err.data.details).forEach(([field, messages]) => {
    form.setError(field as keyof FormValues, {
      message: (messages as string[])[0],
    })
  })
}
```

### Other 400 variants

Non-field 400 responses carry a plain `error` string (no `details`):

```json
{ "error": "Expected data to be an array of member records" }
```

```json
{ "error": "Maximum 1000 records per import" }
```

```json
{ "error": "Member not found" }
```

```json
{ "error": "Fund not found" }
```

Password validation failures use `details` as a flat string array, not a field map:

```json
{
  "error": "Password does not meet requirements",
  "details": [
    "Password must be at least 12 characters",
    "Password must contain at least 3 of: lowercase, uppercase, number, special character"
  ]
}
```

Iterate and display these as a bulleted list, not as individual field errors.

---

## 401 Unauthorized

### When it fires

- No `steward_session` cookie and no `Authorization` header present
- Token present but signature is invalid, malformed, or expired
- Token has been revoked (after logout or password change)
- Account has `isActive = false` (checked during login and `requirePrimaryAdmin`)
- Submitted current password is wrong on `POST /api/auth/change-password`

### Response shapes

```json
{ "error": "Authentication required" }
```

```json
{ "error": "Invalid or expired token" }
```

```json
{ "error": "Account is inactive" }
```

```json
{ "error": "Invalid email or password" }
```

```json
{ "error": "Current password is incorrect" }
```

### How the middleware decides

```typescript
// backend/src/middleware/auth.ts (requireAuth)

// No token found in cookie or Authorization header:
res.status(401).json({ error: 'Authentication required' })

// Token found but verifyToken() returns null:
res.status(401).json({ error: 'Invalid or expired token' })
```

Token extraction prefers the `steward_session` httpOnly cookie; falls back to `Authorization: Bearer <token>` for programmatic API clients.

### Client action

Redirect to `/login` and clear the locally stored token:

```typescript
if (err instanceof ApiClientError && err.status === 401) {
  removeToken()
  navigate('/login')
}
```

---

## 403 Forbidden

### When it fires

- Authenticated user lacks the required permission key for the route
- Authenticated user attempts to update member notes without the `members.notes` permission
- Route uses `requirePrimaryAdmin()` and the user is not the primary admin

### Response shape -- permission middleware (`requirePermission`)

```json
{
  "error": "Forbidden",
  "message": "Missing required permission: members.write"
}
```

The `message` field always names the specific missing permission key. The `error` field is always `"Forbidden"`.

### Response shape -- inline business logic guard

```json
{ "error": "You do not have permission to edit member notes" }
```

### Response shape -- primary admin guard (`requirePrimaryAdmin`)

```json
{
  "error": "Forbidden",
  "message": "This action requires primary admin privileges"
}
```

### Distinguishing 401 from 403

| Scenario | Status | error value |
|----------|--------|-------------|
| No token / bad token | 401 | Authentication required or Invalid or expired token |
| Valid token, missing permission | 403 | Forbidden |
| Valid token, editing notes without members.notes | 403 | You do not have permission to edit member notes |

### Client action

Show a "You do not have permission" message in-place. Do not redirect to login -- the user is authenticated. A 403 that occurs unexpectedly may indicate a misconfigured role assignment.

---

## 404 Not Found

### When it fires

- A route-level lookup finds no record (`prisma.*.findUnique` returns `null`)
- The global 404 handler in `app.ts` catches requests to unregistered paths

### Response shapes

```json
{ "error": "Member not found" }
```

```json
{ "error": "Donation not found" }
```

```json
{ "error": "Calendar not found" }
```

```json
{ "error": "User not found" }
```

```json
{ "error": "Not found" }
```

The last shape is the global catch-all handler at the bottom of `app.ts`.

### Client action

Show a "Not found" state in the UI. On list pages, this typically means the item was deleted by another session; invalidate the TanStack Query cache and refetch.

---

## 409 Conflict

### When it fires

Creating or updating a `Member` with an email address already registered to another member.

### Response shape

```json
{ "error": "A member with this email already exists" }
```

The uniqueness check happens before the Prisma write, so no Prisma P2002 error bubbles up.

### Client action

Surface the message directly next to the email field.

---

## 422 Unprocessable Entity

This status code is not currently used in the codebase. Business logic rejections currently return `400`. Use `400` consistently for both schema validation failures and business rule violations until a `422` pattern is formally introduced.

---

## 429 Too Many Requests

### When it fires

Five rate limiters are configured in `backend/src/middleware/rateLimiter.ts`:

| Limiter | Applied To | Window | Max Requests | Counts Successful? |
|---------|-----------|--------|-------------|-------------------|
| `loginRateLimiter` | `POST /api/auth/login` | 15 min | 5 | No |
| `authRateLimiter` | Other auth routes | 15 min | 10 | Yes |
| `apiRateLimiter` | All `/api/*` routes globally | 1 min | 100 | Yes |
| `bulkOperationRateLimiter` | Import/export routes | 1 hour | 10 | Yes |
| `passwordResetRateLimiter` | Password reset routes | 1 hour | 3 | Yes |

`express-rate-limit` sets `standardHeaders: true` and `legacyHeaders: false`, so responses include:

```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1748646000
```

### Response shapes

```json
{ "error": "Too many login attempts. Please try again in 15 minutes." }
```

```json
{ "error": "Too many authentication attempts. Please try again later." }
```

```json
{ "error": "Too many requests. Please slow down." }
```

```json
{ "error": "Too many bulk operations. Please try again later." }
```

```json
{ "error": "Too many password reset requests. Please try again later." }
```

### Client action

Read the `RateLimit-Reset` header (Unix timestamp) and display a countdown. Disable the submit button until the reset time passes.

---

## 500 Internal Server Error

### When it fires

Any unhandled exception inside a route handler`s `try/catch` block.

### Response shapes

```json
{ "error": "Internal server error" }
```

Some routes use a more specific message:

```json
{ "error": "Failed to fetch donations" }
```

```json
{ "error": "Failed to create ministry calendar" }
```

The shape is always `{ error: string }` with no `details` field.

### What gets logged vs. what gets returned

```typescript
try {
  // ...
} catch (error) {
  console.error('Create member error:', error)   // full Error object to stdout/stderr
  res.status(500).json({ error: 'Internal server error' })  // generic to client
}
```

The raw error is written to process output via `console.error` with a descriptive prefix. In production, pipe stdout/stderr to your log aggregator.

Sensitive fields are stripped before logging. `backend/src/lib/security.ts` exports `redactSensitiveData` which removes `password`, `passwordHash`, `token`, `authorization`, and `cookie` keys.

### Prisma error handling

Prisma errors fall through to the generic `catch` block and produce a 500. Two codes are especially relevant:

| Prisma Code | Meaning | Typical Cause |
|-------------|---------|-----|
| `P2002` | Unique constraint violation | Duplicate email when NOT pre-checked |
| `P2025` | Record not found during update/delete | Concurrent deletion |

To surface clean 409/404 for these, catch `PrismaClientKnownRequestError` explicitly:

```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.resource.create({ data })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A record with this value already exists' })
      return
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' })
      return
    }
  }
  console.error('Create resource error:', error)
  res.status(500).json({ error: 'Internal server error' })
}
```

### Client action

Show a generic "Something went wrong" toast. Retry once; if it fails again, prompt the user to contact support.

---

## Audit Log Errors

`createAuditLog` in `backend/src/lib/audit.ts` wraps its Prisma call in its own `try/catch` and logs failures with `console.error("Failed to create audit log:", error)`. Audit log failures never propagate to the route handler and never fail a request. This is intentional -- audit records are observability data, not business-critical for the request path.

---

## Pattern for New Route Error Handlers

Follow this template when adding a new route. The order of checks matters.

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { createAuditLog } from '../lib/audit.js'

const router = Router()

const createResourceSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').nullable().optional(),
})

router.post('/', requireAuth, requirePermission('resource.write'), async (req: Request, res: Response) => {
  try {
    // 1. Validate input with safeParse -- never use .parse() in route handlers
    const parseResult = createResourceSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      })
      return
    }

    const data = parseResult.data

    // 2. Pre-check unique constraints to return clean 409 instead of 500
    if (data.email) {
      const existing = await prisma.resource.findUnique({ where: { email: data.email } })
      if (existing) {
        res.status(409).json({ error: 'A resource with this email already exists' })
        return
      }
    }

    // 3. Execute the database write
    const resource = await prisma.resource.create({ data })

    // 4. Audit log -- errors are silently swallowed inside createAuditLog
    await createAuditLog({
      actorUserId: req.user?.userId,
      action: 'RESOURCE_CREATED',
      entityType: 'Resource',
      entityId: resource.id,
      metadata: { name: resource.name },
    })

    // 5. Return 201 for creates, 200 for updates
    res.status(201).json(resource)
  } catch (error) {
    console.error('Create resource error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', requireAuth, requirePermission('resource.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const resource = await prisma.resource.findUnique({ where: { id } })
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' })
      return
    }
    res.json(resource)
  } catch (error) {
    console.error('Get resource error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
```

**Key rules:**

- Always `return` after calling `res.status(...).json(...)` inside the `try` block. Omitting `return` causes a "Cannot set headers after they are sent" crash.
- Never `throw` from a route handler -- let the `catch` block handle all exceptions.
- Never send the raw `error` object or its `.message` property to the client.
- Use `safeParse` + `flatten().fieldErrors` for Zod validation, not `schema.parse()` which throws and bypasses the explicit 400 path.
- The `ministry-calendars.ts` route uses `schema.parse()` and catches `z.ZodError` inline -- both styles work, but the `safeParse` style matches the rest of the codebase.
