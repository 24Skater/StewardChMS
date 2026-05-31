# Events, Kids Check-In, and Kiosk Domain

## Overview

This domain covers three interconnected areas:

- **Events** - one-time or recurring gatherings. Each event can have multiple **EventOccurrence** rows representing specific scheduled instances.
- **Registrations** - advance sign-ups linking a member (or guest) to an occurrence.
- **Check-Ins** - recording attendance at an occurrence, either manually by staff or through the kiosk.
- **Kids Check-In Kiosk** - a self-service touchscreen flow accessible at `/kids-checkin/kiosk` with no authentication required. Parents look up their child, select an event, confirm, receive a security code, and print a label. Checkout is performed later by entering the 4-character code.

---

## Data Models

### Event

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `title` | `String` | Required. Max 200 chars |
| `description` | `String?` | Optional description |
| `location` | `String?` | Physical or virtual location |
| `category` | `String?` | Free-form category tag |
| `ministryId` | `String?` | Optional link to a Ministry record |
| `isRecurring` | `Boolean` | Default `false`. When `true`, `recurrenceRule` drives occurrence generation |
| `recurrenceRule` | `String?` | JSON string. Schema: `{ frequency: "weekly"\|"monthly", dayOfWeek: 0-6, weekOfMonth?: 1-5 }` |
| `startDatetime` | `DateTime?` | Used as template time for recurring events; the actual event start for one-time events |
| `endDatetime` | `DateTime?` | Used to compute occurrence duration |
| `createdAt` | `DateTime` | Auto-set |
| `updatedAt` | `DateTime` | Auto-updated |

### EventOccurrence

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `eventId` | `String` | FK to Event. Cascade-deletes when event is deleted |
| `startsAt` | `DateTime` | Required. Occurrence start timestamp |
| `endsAt` | `DateTime?` | Optional end timestamp |
| `status` | `OccurrenceStatus` | Enum: `scheduled`, `canceled`. Default `scheduled` |
| `notes` | `String?` | Staff notes specific to this occurrence |

Unique constraint: `(eventId, startsAt)` - prevents duplicate occurrences for the same event at the same time. This is also used to skip duplicates during `generate-occurrences`.

### Registration

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `eventOccurrenceId` | `String` | FK to EventOccurrence |
| `memberId` | `String?` | FK to Member (null for guest registrations) |
| `guestName` | `String?` | Used when registering without a member account |
| `guestEmail` | `String?` | Guest contact email |
| `guestPhone` | `String?` | Guest contact phone |
| `partySize` | `Int` | Number of attendees in this registration. Default `1` |
| `status` | `RegistrationStatus` | Enum: `registered`, `canceled`. Default `registered` |
| `createdAt` | `DateTime` | Auto-set |

### CheckIn

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `eventOccurrenceId` | `String` | FK to EventOccurrence |
| `memberId` | `String?` | FK to Member (null for walk-in guests) |
| `guestName` | `String?` | Guest name when not linked to a member |
| `checkedInAt` | `DateTime` | Auto-set to `now()` on creation |
| `checkedOutAt` | `DateTime?` | Set when the child is picked up; `null` means still present |
| `method` | `String` | How the check-in was recorded. Default `"manual"`; kiosk-initiated check-ins use this field |

---

## API Endpoints

### Events (`/api/events`)

#### `POST /api/events`

Create a new event.

**Permission:** `events.write`

**Request body (TypeScript):**



If `recurrenceRule` is provided it must parse as valid JSON matching `{ frequency, dayOfWeek, weekOfMonth? }`.

**Response 201:** Event object.

**Errors:** `400` validation or invalid recurrence rule; `500` database error

**Audit log:** `EVENT_CREATED`

---

#### `GET /api/events`

List events with optional filters.

**Permission:** `events.read`

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `dateFrom` | ISO string | Filter events with `startDatetime` >= this value |
| `dateTo` | ISO string | Filter events with `startDatetime` <= this value |
| `category` | string | Exact match on `category` |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |

**Response 200:** `{ events: Event[], total, page, limit, totalPages }`

**Errors:** `400` invalid query params; `500` database error

---

#### `GET /api/events/:id`

Fetch a single event with up to 50 upcoming occurrences.

**Permission:** `events.read`

**Response 200:**



**Errors:** `404` not found; `500` database error

---

#### `PUT /api/events/:id`

Update an event. All fields optional.

**Permission:** `events.write`

**Errors:** `400` validation or invalid recurrence rule; `404` not found; `500` database error

**Audit log:** `EVENT_UPDATED`

---

#### `DELETE /api/events/:id`

Delete an event and all its occurrences (cascade).

**Permission:** `events.write`

**Response 200:** `{ "message": "Event deleted successfully" }`

**Errors:** `404` not found; `500` database error

**Audit log:** `EVENT_DELETED`

---

#### `POST /api/events/:id/generate-occurrences`

Generate future occurrences for an event based on its recurrence rule (or a single occurrence for non-recurring events with a future `startDatetime`).

**Permission:** `events.write`

**Request body:**



`daysAhead` defaults to `90`, max `365`. Duplicate occurrences (same `eventId` + `startsAt`) are skipped silently.

**Response 200:**



**Recurrence rule schema:**



For `weekly` frequency, every matching weekday within the `daysAhead` window is created. For `monthly`, the Nth occurrence of that weekday in each month is created.

**Audit log:** `OCCURRENCES_GENERATED`

---

### Kids Check-In (`/api/kids-checkin`)

All kids check-in routes require `requireAuth` (applied to the whole router) in addition to the individual permission checks listed below.

#### `GET /api/kids-checkin/children`

Fetch all active children (members with `isChild: true` and `status: active`) with their parent/guardian details derived from household membership.

**Permission:** `checkin.view`

**Response 200:** Array of child objects. Each object includes:



Parents are derived from household members where `isChild` is `false`. Duplicate parents across multiple households are deduplicated by member ID.

**Errors:** `500` database error

---

#### `GET /api/kids-checkin/occurrences`

Fetch today's event occurrences available for check-in. "Today" is midnight to midnight in server local time.

**Permission:** `checkin.view`

**Response 200:** Array of occurrence objects, ordered by `startsAt` ascending. Each includes the parent event title and a `_count.checkIns` field.

**Errors:** `500` database error

---

#### `GET /api/kids-checkin/checked-in`

Fetch children currently checked in (checked in today, `checkedOutAt` is null).

**Permission:** `checkin.view`

**Query parameters:** `occurrenceId` (optional) - filter to a specific occurrence.

**Response 200:** Array of CheckIn objects including member and event details.

---

#### `GET /api/kids-checkin/stats`

Today's check-in statistics.

**Permission:** `checkin.view`

**Response 200:**



---

#### `POST /api/kids-checkin/checkin`

Check in a child to an event occurrence.

**Permission:** `checkin.operate`

**Request body:**



`parentGuardianName` is optional. On success:

1. If the member has no `securityCode`, a unique 4-character alphanumeric code is generated using `crypto.randomInt` with a set that excludes visually confusing characters (no O, 0, I, 1). Up to 10 generation attempts are made to ensure uniqueness.
2. A `CheckIn` row is created.
3. The response includes a `label` object suitable for printing.

**Response 201:**



**Errors:**
- `400` validation failed, or member is not marked `isChild: true`, or already checked in to this occurrence
- `404` member not found, or occurrence not found
- `500` database error

---

#### `POST /api/kids-checkin/checkout`

Check out a child using their security code.

**Permission:** `checkin.operate`

**Request body:** `{ "securityCode": "A3KP" }`

The code is uppercased before lookup. Finds the most recent check-in today for that member where `checkedOutAt` is null.

**Response 200:** Updated CheckIn object with `checkedOutAt` set.

**Errors:** `404` invalid security code, or no active check-in found today; `500` database error

---

#### `POST /api/kids-checkin/checkout/:checkInId`

Staff override checkout by check-in record ID. Used when the security code is unavailable.

**Permission:** `checkin.operate`

**Response 200:** Updated CheckIn object.

**Errors:** `400` already checked out; `404` check-in not found; `500` database error

---

## Kids Check-In Flow

The kiosk is a multi-step wizard rendered by `KioskModePage` at the public route `/kids-checkin/kiosk`. No authentication is required.



### Step-by-Step Description

**Step 1 - Phone Number Entry:** The kiosk displays a numeric keypad. The parent enters their 10-digit phone number. The form requires exactly 10 digits before the submit button activates.

**Step 2 - Child Lookup:** The kiosk attempts `GET /kids-checkin/lookup?phone=...` (the `auth: false` flag passes no session cookie). If that endpoint is unavailable (404 or network error), it falls back to `GET /kids-checkin/children` and slices the first 5 results for demo purposes.

**Step 3 - Select Child:** Children are listed as large buttons showing first/last name and an allergy indicator. If no children are found for the phone number, an error message instructs the family to see a volunteer.

**Step 4 - Select Event (conditional):** If today has exactly one occurrence, this step is skipped and the single occurrence is automatically selected. If there are multiple, each is shown as a button with the event title and start time. If there are zero occurrences, an error is shown.

**Step 5 - Confirm:** Displays child name, event name, and any allergies in a highlighted warning box. The parent taps Confirm Check-In.

**Step 6 - Check-In Complete:** The server generates a security code (if the child does not already have one), creates a `CheckIn` record, and returns a `label` object. The label is rendered in a printable `<div>` and the parent taps Print Label.

**Step 7 - Label Printing:** Uses `react-to-print` (`useReactToPrint` hook) to trigger a browser print dialog targeting the label `<div>` via a `contentRef`. The label shows: child name, event name, security code (large monospace), allergies (red background), medical notes (yellow background), and check-in timestamp.

**Checkout Flow:** From the initial phone-entry screen, the parent can tap Check Out instead. They enter the 4-character security code. The kiosk posts `{ securityCode }` to `POST /api/kids-checkin/checkout`. On success, the screen resets after 2 seconds.

**Auto-Reset:** An `useEffect` timer resets the kiosk to the phone-entry step after 60 seconds of inactivity (i.e., 60 seconds without a step change, phone number change, or child/occurrence selection). The timer is cleared and restarted on each dependency change.

---

## Kiosk Mode

### Public Route

The kiosk is mounted at `/kids-checkin/kiosk` as a public route in `App.tsx` - it is not wrapped in `ProtectedRoute` and requires no session cookie.

### Auth-Free API Calls

The kiosk passes `{ auth: false }` as an option to `apiRequest`, which skips attaching the `steward_session` cookie to fetch calls. This allows the kiosk to operate without a logged-in session. The backend endpoints themselves still enforce `requireAuth` - if the kiosk needs to call backend routes in a fully anonymous context, those routes would need to be restructured (this is a current limitation).

In practice, the kiosk is intended to be used on a dedicated device where a staff member can log in once, and the session persists for the browser session.

### Theme Toggle

The `useKioskTheme` hook (`frontend/src/hooks/useKioskTheme.ts`) manages a light/dark toggle:

- State is persisted in `localStorage` under the key `kiosk-theme`.
- Default is **dark** (the stored value is treated as dark unless explicitly `"light"`).
- Toggle writes `"dark"` or `"light"` to localStorage on each toggle.
- The kiosk root `<div>` receives a `dark` CSS class when `isDark` is true, activating Tailwind dark mode styles.
- A small circular button in the bottom-right corner shows a Sun or Moon icon and triggers the toggle.

### Label Printing

Label printing uses the `react-to-print` library. The `handlePrint` function is created with `useReactToPrint({ contentRef: labelRef, documentTitle: "Check-in Label" })`. When called, it opens a print dialog targeting only the label `<div>` (identified by the `labelRef`).

The printed label includes:
- Event name
- Child full name (large)
- Security code (very large, monospace, with letter-spacing)
- Allergies block (red background) - only shown if `allergies` is non-null
- Medical notes block (yellow background) - only shown if `medicalNotes` is non-null
- Check-in timestamp

---

## Frontend Pages

| Route | Component | Auth Required | Purpose |
|---|---|---|---|
| `/events` | `EventsPage` | Yes | Paginated event list with date/category filters |
| `/events/new` | `EventFormPage` | Yes | Create event form |
| `/events/:id` | `EventDetailPage` | Yes | Event detail with occurrence list |
| `/events/:id/edit` | `EventFormPage` | Yes | Edit event form |
| `/occurrences/:id` | `OccurrenceDetailPage` | Yes | Single occurrence with registrations and check-in list |
| `/kids-checkin` | `KidsCheckinPage` | Yes | Staff dashboard: view checked-in children, manual check-in/out |
| `/kids-checkin/kiosk` | `KioskModePage` | No | Self-service parent kiosk |

---

## Permission Keys

| Key | Endpoints gated |
|---|---|
| `events.read` | `GET /api/events`, `GET /api/events/:id` |
| `events.write` | `POST /api/events`, `PUT /api/events/:id`, `DELETE /api/events/:id`, `POST /api/events/:id/generate-occurrences` |
| `checkin.view` | `GET /api/kids-checkin/children`, `GET /api/kids-checkin/occurrences`, `GET /api/kids-checkin/checked-in`, `GET /api/kids-checkin/stats` |
| `checkin.operate` | `POST /api/kids-checkin/checkin`, `POST /api/kids-checkin/checkout`, `POST /api/kids-checkin/checkout/:checkInId` |
| `attendance.view` | Attendance reporting endpoints (separate from kids check-in) |

> Note: the kids check-in router applies `requireAuth` globally via `router.use(requireAuth)` before any individual route handlers.
