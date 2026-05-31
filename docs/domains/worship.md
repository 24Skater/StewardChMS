# Worship Planning

## Overview

The Worship Planning domain manages a song library and per-service worship plans.
Each plan is attached to a specific EventOccurrence (a single instance of a recurring or one-time event).
Plans contain an ordered list of items that can be songs, scripture readings, announcements,
sermons, prayers, or other elements. Songs in the library can be reused across plans.

---

## Data Models

### Song

A library entry for a single song.

| Field | Type | Notes |
|---|---|---|
| `title` | `String` | Required; unique by Prisma index |
| `artist` | `String?` | Optional artist/band name |
| `defaultKey` | `String?` | Musical key (e.g. G, Ab) |
| `bpm` | `Int?` | Beats per minute |
| `lyrics` | `String?` | Full lyrics text |

### WorshipPlan

One plan per EventOccurrence (enforced via a unique constraint on eventOccurrenceId).

| Field | Type | Notes |
|---|---|---|
| `eventOccurrenceId` | `String` | Unique FK to EventOccurrence |
| `title` | `String?` | Optional display title |
| `notes` | `String?` | Free-text notes for the planning team |

### WorshipPlanItem

One element in a worship plan. Items are ordered by `sortOrder` (0-indexed integer).

| Field | Type | Notes |
|---|---|---|
| `worshipPlanId` | `String` | FK to WorshipPlan |
| `sortOrder` | `Int` | 0-indexed; drives display order |
| `itemType` | string | One of: `song`, `scripture`, `announcement`, `sermon`, `prayer`, `other` |
| `title` | `String` | Required display title |
| `details` | `String?` | Additional notes (e.g. scripture reference, key for this service) |
| `songId` | `String?` | Optional FK to Song (for itemType = song) |
| `assignedMemberId` | `String?` | Optional FK to Member (e.g. who delivers the sermon) |
| `durationMinutes` | `Int?` | Planned duration |

---

## API Endpoints

All endpoints require a valid JWT session cookie (`steward_session`).

### Songs

**Base path:** `/api/songs`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/songs` | `worship.write` | Add a song to the library |
| GET | `/api/songs` | `worship.read` | List / search songs |
| GET | `/api/songs/:id` | `worship.read` | Get a single song |
| PUT | `/api/songs/:id` | `worship.write` | Update a song |
| DELETE | `/api/songs/:id` | `worship.write` | Delete a song |

**GET /api/songs query params:**

| Param | Type | Notes |
|---|---|---|
| `search` | `String` | Case-insensitive search on title and artist |
| `page` | `Int` | Default 1 |
| `limit` | `Int` | Default 20, max 100 |

### Worship Plans

Plans are scoped to an EventOccurrence. Creating a plan for an occurrence that already has one
upserts (updates) the existing plan rather than failing.

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/occurrences/:id/worship-plan` | `worship.write` | Create or update a plan for an occurrence |
| GET | `/api/occurrences/:id/worship-plan` | `worship.read` | Get the plan for an occurrence (404 if none) |
| PUT | `/api/worship-plans/:id` | `worship.write` | Update plan title/notes |
| POST | `/api/worship-plans/:id/items` | `worship.write` | Add an item to a plan |
| PUT | `/api/worship-plans/items/:itemId` | `worship.write` | Update an item |
| DELETE | `/api/worship-plans/items/:itemId` | `worship.write` | Remove an item |
| PUT | `/api/worship-plans/:id/reorder` | `worship.write` | Bulk-update sortOrder for all items |

**Add item request body:**

```json
{
  "sortOrder": 0,
  "itemType": "song",
  "title": "How Great Is Our God",
  "details": "Key: G",
  "songId": "cms123...",
  "assignedMemberId": null,
  "durationMinutes": 5
}
```

**Reorder request body:**

```json
{
  "items": [
    { "id": "item1...", "sortOrder": 0 },
    { "id": "item2...", "sortOrder": 1 }
  ]
}
```

All sortOrder updates for a reorder are applied inside a single Prisma transaction.

---

## Service Plan Flow

1. Navigate to an event occurrence in the Events domain.
2. POST /api/occurrences/:id/worship-plan to create the plan (upserts if one exists).
3. POST /api/worship-plans/:id/items for each element (songs, sermon, etc.) with the correct sortOrder.
4. To reorder, call PUT /api/worship-plans/:id/reorder with the full updated order array.
5. To generate a set list for print/export, call GET /api/occurrences/:id/worship-plan,
   which returns the plan with all items in sortOrder sequence including song details.

There is no dedicated export endpoint; the frontend uses the GET response to render a printable
or copy-pasteable set list.

---

## Permission Keys

| Key | Grants |
|---|---|
| `worship.read` | View songs and worship plans |
| `worship.write` | Create, update, and delete songs, plans, and plan items |

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/songs.ts` | Song library CRUD |
| `backend/src/routes/worship-plans.ts` | Plan upsert, item management, reorder |
| `backend/prisma/schema.prisma` | Song, WorshipPlan, WorshipPlanItem models |
