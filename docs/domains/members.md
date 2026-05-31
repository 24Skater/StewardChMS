# Members & Households Domain

## Overview

The Members & Households domain is the core CRM layer of StewardChMS. It manages individual member profiles, their demographic and contact information, lifecycle status, and the grouping of members into family units called households.

Two primary models drive this domain:

- **Member** - a single person record with contact details, status, and optional kids check-in fields.
- **Household** - a named grouping of members, linked through the **HouseholdMember** join table, which records the relationship each person holds within that household.

A member can belong to multiple households; a household can contain any number of members.

---

## Data Model

### Member

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `firstName` | `String` | Required. Max 100 chars |
| `lastName` | `String` | Required. Max 100 chars |
| `email` | `String?` | Unique across all members. Used for CSV duplicate detection |
| `phone` | `String?` | Max 20 chars |
| `street` | `String?` | Street address line |
| `city` | `String?` | City |
| `state` | `String?` | State or province |
| `zip` | `String?` | Postal code |
| `dateOfBirth` | `DateTime?` | ISO date; returned as ISO 8601 string in API responses |
| `status` | `MemberStatus` | Enum - see below. Default: `active` |
| `notes` | `String?` | Free text. Visibility and editability gated by `members.notes` permission |
| `profilePhotoUrl` | `String?` | URL to profile photo |
| `isChild` | `Boolean` | Default `false`. Set `true` for Kids Check-In participants |
| `securityCode` | `String?` | 4-char alphanumeric code, unique. Auto-generated on first kids check-in |
| `allergies` | `String?` | Displayed on the kids check-in label |
| `medicalNotes` | `String?` | Displayed on the kids check-in label |
| `parentalNotes` | `String?` | Internal staff notes, not shown on label |
| `createdAt` | `DateTime` | Auto-set on creation |
| `updatedAt` | `DateTime` | Auto-updated on every write |

### MemberStatus Enum

| Value | Meaning |
|---|---|
| `active` | Regular, current member |
| `inactive` | No longer active; soft-delete state set when `DELETE /api/members/:id` is called |
| `visitor` | Has attended but has not formally joined |

### Household

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `name` | `String?` | Optional display name (e.g., The Smith Family) |
| `createdAt` | `DateTime` | Auto-set |
| `updatedAt` | `DateTime` | Auto-updated |

### HouseholdMember (Join Table)

Connects a `Member` to a `Household` with an explicit relationship type. The compound unique constraint `(householdId, memberId)` prevents duplicate links.

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `householdId` | `String` | FK to Household. Cascade-deletes when household is deleted |
| `memberId` | `String` | FK to Member. Cascade-deletes when member is deleted |
| `relationshipType` | `RelationshipType` | Enum: `parent`, `child`, `spouse`, `other` |

---

## API Endpoints

All endpoints are prefixed with `/api`. Every endpoint requires a valid session cookie (`steward_session`).

### Members

#### `GET /api/members`

List members with optional search and filter.

**Permission:** `members.read`

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | `string` | - | Case-insensitive substring match on `firstName`, `lastName`, or `email` |
| `status` | `active` \| `inactive` \| `visitor` | - | Filter by status |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Results per page, max `100` |

**Response 200:**



The `notes` field appears only if the authenticated user has the `members.notes` permission; otherwise it is omitted from responses entirely.

**Errors:** `400` invalid query params; `500` database error

---

#### `GET /api/members/:id`

Fetch a single member by ID.

**Permission:** `members.read`

**Response 200:** Single member object including the `households` array.

**Errors:** `404` member not found; `500` database error

---

#### `POST /api/members`

Create a new member.

**Permission:** `members.write`

**Request body (TypeScript):**



**Response 201:** Created member object.

**Errors:** `400` validation failed; `409` email already exists; `500` database error

**Audit log:** `MEMBER_CREATED`

---

#### `PUT /api/members/:id`

Update a member. All fields optional (partial update).

**Permission:** `members.write`

Attempting to set `notes` without the `members.notes` permission returns `403` before any changes are applied.

**Response 200:** Updated member object.

**Errors:** `400` validation; `403` notes update without permission; `404` not found; `409` email conflict; `500` database error

**Audit log:** `MEMBER_UPDATED`

---

#### `DELETE /api/members/:id`

Soft-deletes a member by setting `status` to `inactive`. No rows are removed.

**Permission:** `members.delete`

**Response 200:** `{ "message": "Member deleted successfully" }`

**Errors:** `404` not found; `500` database error

**Audit log:** `MEMBER_DELETED` (metadata includes `softDelete: true`)

---

#### `POST /api/members/import`

Bulk import members from a parsed CSV payload. Max 1,000 records per request. Row failures do not halt the import.

**Permission:** `members.write`

**Request body:**



**CSV column schema:**

| Column | Required | Notes |
|---|---|---|
| `first_name` | Yes | Min 1 char |
| `last_name` | Yes | Min 1 char |
| `email` | No | Valid email or empty string; duplicates skip with error entry |
| `phone` | No | No format restriction |

**Response 200:**



Row numbers are 1-indexed. Successfully created members receive `status: active`.

**Errors:** `400` if `data` is not an array or exceeds 1,000 records

**Audit log:** `MEMBERS_IMPORTED`

---

### Households

#### `GET /api/households`

List all households with member rosters. No pagination; all households returned ordered by `createdAt` descending.

**Permission:** `members.read`

**Response 200:**



---

#### `GET /api/households/:id`

Fetch a single household with its member roster.

**Permission:** `members.read`

**Errors:** `404` not found

---

#### `POST /api/households`

Create a new household.

**Permission:** `members.write`

**Request body:** `{ "name": "The Smith Family" }` - `name` is optional, may be null.

**Response 201:** Household object with empty `members` array.

**Audit log:** `HOUSEHOLD_CREATED`

---

#### `PUT /api/households/:id`

Update a household name.

**Permission:** `members.write`

**Request body:** `{ "name": "New Name" }`

**Errors:** `404` not found

**Audit log:** `HOUSEHOLD_UPDATED`

---

#### `DELETE /api/households/:id`

Hard-delete a household. All `HouseholdMember` rows cascade-delete. Member records are unaffected.

**Permission:** `members.delete`

**Response 200:** `{ "message": "Household deleted successfully" }`

**Errors:** `404` not found

**Audit log:** `HOUSEHOLD_DELETED`

---

#### `POST /api/households/:id/members`

Link a member to a household.

**Permission:** `members.write`

**Request body:**



Valid `relationshipType` values: `parent`, `child`, `spouse`, `other`.

**Response 201:**



**Errors:** `400` validation; `404` household or member not found; `409` already linked

**Audit log:** `HOUSEHOLD_MEMBER_LINKED`

---

#### `DELETE /api/households/:id/members/:memberId`

Remove a member from a household. The member record is not deleted.

**Permission:** `members.write`

**Response 200:** `{ "message": "Member unlinked from household successfully" }`

**Errors:** `404` link not found

**Audit log:** `HOUSEHOLD_MEMBER_UNLINKED`

---

## CSV Import Details

The `POST /api/members/import` endpoint expects the client to have already parsed the CSV file into a JSON array. `MemberImportPage` handles CSV parsing before posting.

**Expected column names (exact, case-sensitive):**



**Duplicate handling:** If a row email already exists in the database the row is skipped with an error entry. Rows without email always attempt creation.

**Limit:** 1,000 rows per call. Exceeding this returns `400` before any processing.

---

## Frontend Pages

All routes are wrapped in `ProtectedRoute` and require a valid session.

| Route | Component | Purpose |
|---|---|---|
| `/members` | `MembersPage` | Paginated searchable member list with status filter |
| `/members/new` | `MemberFormPage` | Create member form |
| `/members/import` | `MemberImportPage` | CSV file upload and import |
| `/members/:id` | `MemberDetailPage` | Full profile view including household memberships |
| `/members/:id/edit` | `MemberFormPage` | Edit form (same component, pre-populated) |
| `/households` | `HouseholdsPage` | List of all households |
| `/households/:id` | `HouseholdDetailPage` | Household detail with member roster and link/unlink controls |

### Hooks Reference (`frontend/src/hooks/useMembers.ts`)

| Hook | Description |
|---|---|
| `useMembers(params?)` | Paginated member list; re-fetches when params change |
| `useMember(id)` | Single member; disabled when `id` is falsy |
| `useCreateMember()` | POST create; invalidates `memberKeys.lists()` on success |
| `useUpdateMember()` | PUT update; invalidates detail and list caches |
| `useDeleteMember()` | DELETE soft-delete; invalidates list cache |
| `useImportMembers()` | POST import; invalidates list cache |

**Query key factory:**



Household pages call `apiRequest` directly; there is no dedicated `useHouseholds.ts` hook file.

---

## Permission Keys

| Key | Endpoints and behaviors gated |
|---|---|
| `members.read` | `GET /api/members`, `GET /api/members/:id`, `GET /api/households`, `GET /api/households/:id` |
| `members.write` | `POST/PUT /api/members`, `POST /api/members/import`, `POST/PUT /api/households`, member link/unlink endpoints |
| `members.delete` | `DELETE /api/members/:id`, `DELETE /api/households/:id` |
| `members.notes` | Enables reading `notes` in GET responses and writing it in PUT requests. Without this key, the field is omitted from responses and PUT attempts to change it are rejected with `403`. |

---

## Common Extension Points

### Adding a new field to the member profile

1. Add the column to the `Member` model in `backend/prisma/schema.prisma`.
2. Run `npm run db:migrate -w backend` to create and apply the migration.
3. Run `npm run db:generate -w backend` to regenerate the Prisma client.
4. Add the field to `createMemberSchema` (and by extension `updateMemberSchema`, which is `createMemberSchema.partial()`) in `backend/src/routes/members.ts`.
5. Add the field to the `formatMemberResponse` helper in the same file.
6. Update the shared Zod schema in `shared/src/schemas/` if frontend validation is needed.
7. Add the form input to `MemberFormPage` and the display to `MemberDetailPage`.

### Adding a new MemberStatus value

The status enum must be kept in sync in two places:

1. `backend/prisma/schema.prisma` - the `enum MemberStatus` block.
2. `backend/src/routes/members.ts` - the `memberStatusSchema` Zod enum.

Steps: add the value to both locations, run `npm run db:migrate -w backend`, then update all frontend dropdowns and filters that enumerate status options.
