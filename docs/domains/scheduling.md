# Ministry Scheduling

## Overview

The Ministry Scheduling domain manages rotation-based volunteer duty assignments for church
service ministries. It covers the full lifecycle: calendar creation, volunteer roster management,
monthly period generation, slot assignment, and a read-only TV kiosk display of the published schedule.

A typical use case is a Sunday Worship Team calendar where several volunteers rotate through
sound-board duty each Sunday. An admin creates the calendar, adds volunteers in rotation order,
then generates a monthly period with autoGenerate enabled. The system assigns one member per service
date in round-robin order. When the period is published, email notifications go out to assigned members.
The published schedule is viewable on a wall-mounted TV via a token-protected URL with no login required.

---

## Concepts

### MinistryCalendar

The top-level entity. One calendar represents one ministry scheduling context.

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | Required, max 100 chars |
| `ministryId` | `String` | Required FK to Ministry |
| `shareToken` | `String` | Unique 64-char hex; used for the kiosk URL |
| `reminderDaysBeforeSlot` | `Int` | Default 2; days before slot to send reminder emails |
| `serviceDayOfWeek` | `Int` | 0=Sunday to 6=Saturday; controls auto-generation dates |
| `rotationNextIndex` | `Int` | Pointer into rotation list; advances after each auto-generated period |
| `isActive` | `Boolean` | Soft-delete flag |

### CalendarRotationMember

The ordered volunteer roster. `rotationOrder` (0-indexed integer) determines sequence.
The roster is always replaced wholesale via a single PUT endpoint.

| Field | Notes |
|---|---|
| `calendarId` | FK to MinistryCalendar |
| `memberId` | FK to Member |
| `rotationOrder` | 0-indexed; unique per calendar |

### SchedulePeriod

One calendar month of duty assignments. Status transitions from DRAFT to PUBLISHED only
(irreversible). DRAFT periods can be edited and deleted; PUBLISHED periods cannot.

| Field | Type | Notes |
|---|---|---|
| `calendarId` | `String` | FK to MinistryCalendar |
| `year` | `Int` | e.g. 2026 |
| `month` | `Int` | 1 to 12 |
| `status` | `DRAFT` or `PUBLISHED` | Default DRAFT |

Unique constraint: one period per `(calendarId, year, month)`.

### ScheduleSlot

One duty on one specific date within a period.

| Field | Notes |
|---|---|
| `periodId` | FK to SchedulePeriod |
| `slotDate` | Date of the duty |
| `label` | Optional role label (e.g. Sound Board) |
| `eventOccurrenceId` | Optional FK to EventOccurrence |

Slots in a PUBLISHED period cannot be added, edited, or deleted.

### SlotAssignment

One-to-one with ScheduleSlot. Tracks volunteer notification state.

| Field | Notes |
|---|---|
| `slotId` | Unique FK to ScheduleSlot |
| `memberId` | The assigned volunteer |
| `assignedById` | User who made the assignment |
| `notifiedAt` | Set when the publish-time notification email is sent |
| `reminderSentAt` | Set when the duty reminder email is sent |
| `notes` | Optional free-text notes |

---
## API Endpoints

All endpoints except the public kiosk route require a valid JWT session cookie (`steward_session`).

### Ministry Calendars

**Base path:** `/api/ministry-calendars`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/ministry-calendars` | `schedules.view` | List all active calendars |
| POST | `/api/ministry-calendars` | `schedules.manage` | Create a calendar |
| GET | `/api/ministry-calendars/:id` | `schedules.view` | Get calendar with rotation list |
| PUT | `/api/ministry-calendars/:id` | `schedules.manage` | Update name / description / settings |
| DELETE | `/api/ministry-calendars/:id` | `schedules.manage` | Soft delete (sets isActive = false) |
| PUT | `/api/ministry-calendars/:id/rotation` | `schedules.manage` | Replace the full rotation roster |
| POST | `/api/ministry-calendars/:id/token/regenerate` | `schedules.manage` | Rotate the share token |

Create request body:

```json
{
  "name": "Sunday Worship Team",
  "description": "Sound, lights, and media rotation",
  "ministryId": "cma1b2c3...",
  "reminderDaysBeforeSlot": 2,
  "serviceDayOfWeek": 0
}
```

Replace rotation request body:

```json
{ "memberIds": ["cm111...", "cm222...", "cm333..."] }
```

Passing an empty memberIds array clears the rotation and resets rotationNextIndex to 0.
The shareToken field is only present in GET /:id responses for users who have schedules.manage.
Error cases: 404 calendar not found or soft-deleted; 400 Zod validation failure with details.

### Schedule Periods

**Base path:** `/api/ministry-calendars/:calendarId/periods`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | .../periods | `schedules.view` | List all periods for a calendar |
| POST | .../periods | `schedules.manage` | Create period; optionally auto-generate slots |
| GET | .../periods/:id | `schedules.view` | Get period with slots and assignments; triggers lazy reminders |
| POST | .../periods/:id/publish | `schedules.manage` | Transition a DRAFT period to PUBLISHED |
| DELETE | .../periods/:id | `schedules.manage` | Delete a DRAFT period |

Create request body:

```json
{ "year": 2026, "month": 6, "autoGenerate": true }
```

POST .../periods/:id/publish sends notification emails to assigned members whose notifiedAt is null,
then returns `{ "id": "...", "status": "PUBLISHED" }`.
Error cases: 409 if period exists for that month, already published, or attempting to delete a PUBLISHED period.

### Schedule Slots

**Base path:** `/api/schedule-slots`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/schedule-slots` | `schedules.manage` | Add a slot to a DRAFT period |
| PUT | `/api/schedule-slots/:id` | `schedules.manage` | Edit a slot in a DRAFT period |
| DELETE | `/api/schedule-slots/:id` | `schedules.manage` | Delete a slot in a DRAFT period |
| POST | `/api/schedule-slots/:id/assign` | `schedules.manage` | Assign or re-assign a member |
| DELETE | `/api/schedule-slots/:id/assignment` | `schedules.manage` | Remove the assignment |

Create slot request body:

```json
{ "periodId": "cmp1...", "slotDate": "2026-06-01", "label": "Sound Board", "eventOccurrenceId": null }
```

Assign request body:

```json
{ "memberId": "cmm1...", "notes": "Please arrive 15 min early" }
```

The assign endpoint atomically replaces any existing assignment (old row deleted, new row created).
If the period is PUBLISHED, a notification email is sent immediately on assignment.
The response always includes a conflicts array (see Conflict Detection).
Error cases: 409 when adding, editing, or deleting a slot in a PUBLISHED period.

### Public Schedule

No authentication required. Rate-limited to 60 requests per minute per IP.

| Method | Path | Description |
|---|---|---|
| GET | `/public/schedule/:token` | Returns upcoming published slots for the next 30 days |

Response shape:

```json
{
  "calendarName": "Sunday Worship Team",
  "slots": [
    { "slotDate": "2026-06-01", "label": "Sound Board", "assignedMember": "Jane D." }
  ]
}
```

assignedMember is first name + last-name initial + period (e.g. Jane D.).
Unassigned slots return null. Only PUBLISHED period slots within the next 30 days are returned.

---

## TV Kiosk Display

The kiosk page lives at `/kiosk/:token` in the frontend (no auth wall, no navigation bar).
It renders a full-screen month calendar suitable for a wall-mounted TV.

### Share Token

On calendar creation, crypto.randomBytes(32).toString("hex") produces a 64-character hex token
stored as shareToken. The kiosk URL is `https://<host>/kiosk/<shareToken>`.

Any user with schedules.manage can call `POST /api/ministry-calendars/:id/token/regenerate` to
rotate the token. The old URL is immediately invalidated. The action is recorded in the audit log.

### Auto-Refresh

The kiosk polls every 5 minutes (`REFRESH_INTERVAL_MS = 5 * 60 * 1000`).
An Updated HH:MM timestamp shows when data was last fetched. The interval cleans up on unmount.

### Light/Dark Toggle

A sun/moon icon button (bottom-right corner) calls `useKioskTheme().toggle`().
Theme state is persisted by the hook. Both themes use Tailwind dark-mode classes.

### Calendar Layout

A full-month CSS grid. Slot cards show the duty label (blue) and assigned member name.
Today is highlighted with a blue circle. Text is `vw`-based (scales from 1080p to 4K).

---

## Auto-Generation Logic

When a period is created with `autoGenerate: true`:

1. getDatesForDayOfWeek(year, month, serviceDayOfWeek) returns every occurrence of that day in the month.
2. For each date, one ScheduleSlot and one SlotAssignment are created inside a single Prisma transaction.
3. The assigned member is rotationMembers[rotationNextIndex % rotationSize]; rotationNextIndex increments per slot.
4. After all slots, rotationNextIndex is saved as nextIndex % rotationSize for continuity.

If the rotation list is empty, no slots or assignments are created, but the period record is created.

---

## Conflict Detection

After assigning a member to a slot, the API queries for other SlotAssignment rows where:

- memberId matches the newly assigned member
- The associated slotDate falls on the same calendar day (midnight-to-midnight range)
- The slot is a different slot from the one just assigned

The check spans all calendars. The assignment always succeeds; conflicts are informational:

```json
{
  "assignment": { "id": "...", "memberId": "...", "notes": null },
  "conflicts": [
    { "calendarId": "cmc1...", "calendarName": "Parking Team", "slotDate": "2026-06-07T00:00:00.000Z", "label": "East Lot" }
  ]
}
```

An empty conflicts array means no conflicts were found.

---

## Permission Keys

| Key | Grants |
|---|---|
| `schedules.view` | Read calendars, periods, and slots |
| `schedules.manage` | Full write access: create/update/delete calendars, periods, slots; manage assignments; publish; regenerate tokens |

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/ministry-calendars.ts` | Calendar and rotation CRUD, token regeneration |
| `backend/src/routes/schedule-periods.ts` | Period CRUD, auto-generation, publish, lazy reminders |
| `backend/src/routes/schedule-slots.ts` | Slot CRUD, assignment, conflict detection |
| `backend/src/routes/public-schedule.ts` | Unauthenticated kiosk data endpoint |
| `frontend/src/pages/schedules/ScheduleKioskPage.tsx` | Full-screen TV kiosk component |
| `frontend/src/hooks/useKioskTheme.ts` | Light/dark toggle hook for the kiosk |
| `frontend/src/lib/api/schedules.ts` | Frontend API client for the scheduling domain |
