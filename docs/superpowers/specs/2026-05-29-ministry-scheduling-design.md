# Ministry Scheduling System — Design Spec

**Date:** 2026-05-29
**Status:** Approved
**Phase:** 1 — Core (Calendars + Assignments)

---

## Overview

A Ministry Scheduling system that lets church staff build, manage, and share duty rosters for any ministry (ushers, prayer, Bible reading, cleanup, etc.). Staff generate a monthly draft schedule via auto-rotation, manually override any slot, then publish — which triggers member notifications. A token-based, unauthenticated kiosk URL displays the upcoming schedule on church TVs.

---

## Scope

### Phase 1 (this spec)
- Ministry calendars with rotation lists
- Monthly period generation (draft → publish)
- Manual and auto-rotation slot assignment
- Same-day conflict detection (warn, not block)
- Token-based TV/kiosk display
- Assignment notifications + lazy duty reminders

### Phase 2 (future spec)
- Playwright E2E tests for scheduling workflow and kiosk display
- Real email/SMS providers wired to stub interface
- Recurring slot templates (e.g., every Sunday)
- iCal export per calendar

---

## Data Model

Five new Prisma models added to `backend/prisma/schema.prisma`.

### `MinistryCalendar`

```prisma
model MinistryCalendar {
  id                     String   @id @default(cuid())
  name                   String
  description            String?
  ministryId             String   @map("ministry_id")
  shareToken             String   @unique @map("share_token")
  reminderDaysBeforeSlot Int      @default(2) @map("reminder_days_before_slot")
  serviceDayOfWeek       Int      @default(0) @map("service_day_of_week") // 0=Sunday … 6=Saturday
  rotationNextIndex      Int      @default(0) @map("rotation_next_index")
  isActive               Boolean  @default(true) @map("is_active")
  createdById            String   @map("created_by_id")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  ministry        Ministry                   @relation(...)
  createdBy       User                       @relation(...)
  rotationMembers CalendarRotationMember[]
  periods         SchedulePeriod[]

  @@map("ministry_calendars")
}
```

### `CalendarRotationMember`

Ordered list of members in a calendar's rotation pool.

```prisma
model CalendarRotationMember {
  id             String   @id @default(cuid())
  calendarId     String   @map("calendar_id")
  memberId       String   @map("member_id")
  rotationOrder  Int      @map("rotation_order")

  calendar MinistryCalendar @relation(...)
  member   Member           @relation(...)

  @@unique([calendarId, memberId])
  @@unique([calendarId, rotationOrder])
  @@map("calendar_rotation_members")
}
```

### `SchedulePeriod`

One month's batch of slots.

```prisma
model SchedulePeriod {
  id         String               @id @default(cuid())
  calendarId String               @map("calendar_id")
  year       Int
  month      Int                  // 1–12
  status     SchedulePeriodStatus @default(DRAFT)
  createdAt  DateTime             @default(now()) @map("created_at")
  updatedAt  DateTime             @updatedAt @map("updated_at")

  calendar MinistryCalendar @relation(...)
  slots    ScheduleSlot[]

  @@unique([calendarId, year, month])
  @@map("schedule_periods")
}

enum SchedulePeriodStatus {
  DRAFT
  PUBLISHED
}
```

### `ScheduleSlot`

One duty on one specific date within a period. A slot holds zero or one assignment.

```prisma
model ScheduleSlot {
  id                  String   @id @default(cuid())
  periodId            String   @map("period_id")
  slotDate            DateTime @map("slot_date")
  label               String?  // e.g., "Door 1", "Head Usher", "Opening Prayer"
  eventOccurrenceId   String?  @map("event_occurrence_id")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  period          SchedulePeriod      @relation(...)
  eventOccurrence EventOccurrence?    @relation(...)
  assignment      SlotAssignment?

  @@map("schedule_slots")
}
```

### `SlotAssignment`

Who is assigned to a slot.

```prisma
model SlotAssignment {
  id              String    @id @default(cuid())
  slotId          String    @unique @map("slot_id")
  memberId        String    @map("member_id")
  assignedById    String    @map("assigned_by_id")
  notifiedAt      DateTime? @map("notified_at")
  reminderSentAt  DateTime? @map("reminder_sent_at")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  slot       ScheduleSlot @relation(...)
  member     Member       @relation(...)
  assignedBy User         @relation(...)

  @@map("slot_assignments")
}
```

### New Permissions (seeded)

| Key | Description |
|-----|-------------|
| `schedules.view` | View ministry calendars and schedules |
| `schedules.manage` | Full CRUD on calendars, periods, slots, and assignments |

A new **"Scheduler"** role is seeded with `schedules.manage`. Admins retain all permissions.

---

## Backend API

Three new route files registered in `backend/src/app.ts`. All protected routes use `requireAuth()`.

### `backend/src/routes/ministry-calendars.ts`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/api/ministry-calendars` | `schedules.view` | List all active calendars |
| `POST` | `/api/ministry-calendars` | `schedules.manage` | Create calendar; auto-generates `shareToken` |
| `GET` | `/api/ministry-calendars/:id` | `schedules.view` | Get calendar with rotation list |
| `PUT` | `/api/ministry-calendars/:id` | `schedules.manage` | Update name, description, reminder days |
| `DELETE` | `/api/ministry-calendars/:id` | `schedules.manage` | Soft-delete (sets `isActive: false`) |
| `PUT` | `/api/ministry-calendars/:id/rotation` | `schedules.manage` | Replace full rotation list |
| `POST` | `/api/ministry-calendars/:id/token/regenerate` | `schedules.manage` | Rotate share token; old TV links break immediately; audit-logged |

### `backend/src/routes/schedule-periods.ts`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/api/ministry-calendars/:calendarId/periods` | `schedules.view` | List periods, most recent first |
| `POST` | `/api/ministry-calendars/:calendarId/periods` | `schedules.manage` | Create draft period; accepts `autoGenerate: boolean` to populate slots via rotation. When `autoGenerate: true`, one slot is created for each occurrence of `calendar.serviceDayOfWeek` within the requested month (e.g., if `serviceDayOfWeek=0`, generates all Sundays of the month). |
| `GET` | `/api/ministry-calendars/:calendarId/periods/:id` | `schedules.view` | Get period with all slots and assignments |
| `POST` | `/api/ministry-calendars/:calendarId/periods/:id/publish` | `schedules.manage` | Transition `DRAFT → PUBLISHED`; notifies all unnotified assignments; audit-logged |
| `DELETE` | `/api/ministry-calendars/:calendarId/periods/:id` | `schedules.manage` | Delete draft period only (published periods return 409) |

### `backend/src/routes/schedule-slots.ts`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/schedule-slots` | `schedules.manage` | Add manual slot to a DRAFT period |
| `PUT` | `/api/schedule-slots/:id` | `schedules.manage` | Update date, label, or `eventOccurrenceId` (DRAFT only) |
| `DELETE` | `/api/schedule-slots/:id` | `schedules.manage` | Remove slot (DRAFT only) |
| `POST` | `/api/schedule-slots/:id/assign` | `schedules.manage` | Assign member; returns `{ assignment, conflicts: ConflictInfo[] }` |
| `DELETE` | `/api/schedule-slots/:id/assignment` | `schedules.manage` | Unassign member |

**Conflict detection:** On `POST /assign`, the API queries all `SlotAssignment` records for the same `memberId` on the same `slotDate` across all calendars. A non-empty `conflicts` array in the response is a warning, not a block. The assignment is created regardless.

`ConflictInfo` shape returned in `conflicts[]`:
```typescript
interface ConflictInfo {
  calendarId: string
  calendarName: string
  slotDate: string   // ISO date string
  label: string | null
}
```

### `backend/src/routes/public-schedule.ts` (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/public/schedule/:token` | Return upcoming published slots for next 30 days |

Response shape for each slot:
```json
{
  "slotDate": "2026-06-01",
  "label": "Head Usher",
  "assignedMember": "Maria T."
}
```
Never returns member ID, email, phone, or full last name.

---

## Frontend

### Pages (`frontend/src/pages/schedules/`)

| File | Route | Description |
|------|-------|-------------|
| `SchedulesPage.tsx` | `/schedules` | Lists all ministry calendars, grouped by ministry |
| `ScheduleFormPage.tsx` | `/schedules/new`, `/schedules/:id/edit` | Create or edit a calendar |
| `ScheduleDetailPage.tsx` | `/schedules/:id` | Calendar overview — rotation list + period list |
| `SchedulePeriodPage.tsx` | `/schedules/:id/periods/:periodId` | Monthly scheduling grid — slot rows, assignment column, publish button |
| `ScheduleKioskPage.tsx` | `/kiosk/:token` | Public TV display — no auth, auto-refreshes every 5 minutes |

`ScheduleKioskPage` is registered in `App.tsx` **outside** `<ProtectedRoute>` so it is accessible without a session.

### Hook

**`frontend/src/hooks/useSchedules.ts`** — TanStack Query hooks for all calendar, period, and slot operations. Follows the same pattern as `useMembers.ts`.

### API Module

New schedule API calls go into **`frontend/src/lib/api/schedules.ts`** — the first step toward splitting the oversized `api.ts` (currently 1,986 lines). The existing `api.ts` is not touched.

### `SchedulePeriodPage` Behavior

- Slots display as rows sorted by `slotDate` then `label`
- Each row shows: date, label (if set), assigned member name (or "Unassigned")
- A yellow warning badge appears on any slot where `conflicts.length > 0`
- Clicking a slot opens an inline member picker (search by name)
- Draft periods: all slots are editable; "Publish" button is active
- Published periods: read-only; only "Unassign" is available per slot

---

## Notifications

### Assignment Notification

Fires when a `SchedulePeriod` transitions `DRAFT → PUBLISHED`. The publish endpoint:
1. Queries all `SlotAssignment` records in the period where `notifiedAt IS NULL`
2. Sends a message via the existing messaging stub for each
3. Stamps `notifiedAt = now()` on each assignment

Assignments added to an **already-published** period are notified immediately on `POST /assign`.

### Duty Reminder

Controlled by `MinistryCalendar.reminderDaysBeforeSlot` (default: 2).

Reminders are triggered lazily on `GET /api/ministry-calendars/:calendarId/periods/:id`. The handler checks: for each assignment in the period, if `slotDate <= now + reminderDays` and `reminderSentAt IS NULL`, send the reminder and stamp `reminderSentAt = now()`.

This avoids a cron dependency in Phase 1. A background job can replace the lazy check in Phase 2 without changing the data model.

### Message Templates

Two new seed templates added to the `MessageTemplate` table:

| Key | Default Body |
|-----|-------------|
| `schedule.assigned` | `Hi {name}, you are scheduled for {duty} on {date} at {church_name}.` |
| `schedule.reminder` | `Reminder: you are scheduled for {duty} in {days} day(s) at {church_name}.` |

Since `email-stub.ts` and `sms-stub.ts` log to console only, notifications work correctly in development and will fire for real when real providers are connected.

---

## Security

### Authentication & Authorization

All schedule management routes use `requireAuth()` + `requirePermission('schedules.manage')` or `schedules.view`. No new auth infrastructure required.

### Share Token

- Generated with `crypto.randomBytes(32).toString('hex')` at calendar creation
- Never returned in list/detail API responses except to users with `schedules.manage`
- Regeneration is an explicit action, audit-logged, immediately invalidates old TV displays
- Cannot be guessed or enumerated (not sequential, not UUID)

### Public Endpoint Hardening

`GET /public/schedule/:token` receives three protections:
1. **Rate limiting** — 60 requests/min per IP via the existing `rateLimiter` middleware
2. **No sensitive data** — response contains only slot date, label, and `"First L."` format member name
3. **Indexed token lookup** — `findUnique` on the `shareToken` field (DB index); no timing differences between valid and invalid tokens

### Audit Logging

`createAuditLog` is called on:
- Calendar create / soft-delete
- Token regeneration
- Period publish
- Slot assignment create / delete

---

## Testing

### Backend Integration Tests (Vitest + Supertest)

| File | Key scenarios |
|------|--------------|
| `ministry-calendars.test.ts` | CRUD, token generation, token regeneration invalidates old token, 403 without `schedules.manage` |
| `schedule-periods.test.ts` | Draft create, auto-generate rotation wraps correctly, publish transition stamps `notifiedAt`, double-publish returns 409 |
| `schedule-slots.test.ts` | Add/delete slot (DRAFT only), assign/unassign, conflict array in response, delete published-period slot returns 409 |
| `public-schedule.test.ts` | Valid token returns slots, invalid token returns 404, response contains anonymized name only (no email/phone), rate-limit header present |

### Frontend Component Tests (Vitest)

`SchedulePeriodPage`:
- Assigned member name renders in slot row
- Conflict warning badge appears when `conflicts.length > 0`
- Publish button is present on DRAFT period, absent on PUBLISHED period

### Not In Phase 1

Playwright E2E tests are deferred to Phase 2 once the feature is stable.

---

## File Checklist

### New files
- `backend/src/routes/ministry-calendars.ts`
- `backend/src/routes/ministry-calendars.test.ts`
- `backend/src/routes/schedule-periods.ts`
- `backend/src/routes/schedule-periods.test.ts`
- `backend/src/routes/schedule-slots.ts`
- `backend/src/routes/schedule-slots.test.ts`
- `backend/src/routes/public-schedule.ts`
- `backend/src/routes/public-schedule.test.ts`
- `frontend/src/pages/schedules/SchedulesPage.tsx`
- `frontend/src/pages/schedules/ScheduleFormPage.tsx`
- `frontend/src/pages/schedules/ScheduleDetailPage.tsx`
- `frontend/src/pages/schedules/SchedulePeriodPage.tsx`
- `frontend/src/pages/schedules/ScheduleKioskPage.tsx`
- `frontend/src/hooks/useSchedules.ts`
- `frontend/src/lib/api/schedules.ts`

### Modified files
- `backend/prisma/schema.prisma` — 5 new models + 1 enum
- `backend/prisma/migrations/` — new migration file
- `backend/prisma/seed.ts` — 2 new permissions, 1 new role, 2 new message templates
- `backend/src/app.ts` — register 3 new routes + public route
- `frontend/src/App.tsx` — register 5 new routes (4 protected, 1 public)
- `shared/src/schemas/` — Zod schemas for MinistryCalendar, SchedulePeriod, ScheduleSlot, SlotAssignment
