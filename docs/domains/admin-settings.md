# Admin and Settings

## Overview

The Admin and Settings domain handles first-run setup, persistent system configuration, admin-only
user management, the seed account lifecycle, and the Groups and Ministries organizational structure.

---

## Setup Wizard

The setup wizard runs once at first install. It is accessed at `/setup` in the frontend
and backed by the `/api/setup` routes.

### How Setup Detection Works

GET /api/setup/status checks three conditions:
1. Whether a User row with isPrimaryAdmin = true exists.
2. Whether the setting `{ category: "system", key: "setup_complete" }` exists and is truthy.
3. Whether any non-seed user accounts exist.

The response includes `needsSetup: true` when no primary admin exists or setup is not complete.
The frontend redirects to the wizard when needsSetup is true.

### Setup Steps

| Step | Endpoint | Creates |
|---|---|---|
| 1 -- Admin Account | POST /api/setup/step1 | Primary admin user, admin role, all permissions assigned to admin, JWT secret in settings |
| 2 -- Church Profile | POST /api/setup/step2 | church.* settings (name, address, timezone, currency) |
| 3 -- Branding | POST /api/setup/step3 | branding.* settings (logo_url, favicon_url, primary_color, tagline) |
| 4 -- Email | POST /api/setup/step4 | email.* settings (provider, SMTP config, SendGrid key) |
| Finalize | POST /api/setup/complete | system.setup_complete = true, system.setup_completed_at |

### Why Setup Cannot Be Re-Run

Step 1 checks for an existing user with isPrimaryAdmin = true and returns 400 if one is found.
It also checks for any non-seed users. Once either condition is met, step 1 is blocked.

The subsequent steps do not check for prior completion -- they are upserts that can be re-applied
from the admin settings page after initial setup.

---

## Settings System

The `Setting` model is a key-value store grouped by category:

| Field | Type | Notes |
|---|---|---|
| `category` | `String` | Grouping (church, branding, email, security, system, setup) |
| `key` | `String` | Setting identifier within the category |
| `value` | `Json` | Any JSON-serializable value |
| `updatedBy` | `String?` | User ID of last editor |

Unique constraint: `(category, key)`.

### Known Setting Keys

| Category | Key | Description |
|---|---|---|
| church | name | Church display name |
| church | address / city / state / zip / phone / website | Contact details |
| church | timezone | IANA timezone (e.g. America/New_York) |
| church | currency | Currency code (e.g. USD) |
| branding | logo_url | Logo image URL |
| branding | primary_color | Hex color string (e.g. #2563EB) |
| branding | tagline | Tagline text |
| email | provider | none, smtp, or sendgrid |
| email | smtp_host / smtp_port / smtp_user / smtp_password | SMTP config |
| email | sendgrid_api_key | SendGrid API key |
| email | from_email / from_name | Sender identity |
| security | jwt_secret | JWT signing secret (generated at step 1) |
| system | setup_complete | true once wizard finishes |
| system | setup_completed_at | ISO timestamp of setup completion |

---

## Settings API Endpoints

All settings routes require `admin.access` permission.

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Get all settings grouped by category |
| GET | `/api/settings/:category` | Get settings for a single category |
| PUT | `/api/settings/:category/:key` | Update a single setting |
| PUT | `/api/settings` | Batch update multiple settings |
| GET | `/api/settings/public/branding` | Get branding settings (no auth required) |

Sensitive keys (`smtp_password`, `sendgrid_api_key`, `jwt_secret`) are
masked as `[CONFIGURED]` in GET responses. The actual values are never returned.

---

## Admin Operations

### requirePrimaryAdmin Guard

The middleware `requirePrimaryAdmin()` enforces that the authenticated user has
`isPrimaryAdmin = true` on their User row. It is used for:

- Seed account management endpoints

The standard admin role (`admin.access` permission) can access settings and most admin
functionality, but seed account management is restricted to the primary admin only.

### Seed Account Management

The seed account is a pre-created development/testing user. After setup completes, it is
automatically disabled (`isActive = false`). The primary admin can re-enable it for
troubleshooting.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/setup/seed-account/status` | Primary admin only | Check if seed account exists and its status |
| POST | `/api/setup/seed-account/enable` | Primary admin only | Enable seed account with new password |
| POST | `/api/setup/seed-account/disable` | Primary admin only | Disable seed account |

The enable endpoint requires a password of at least 12 characters that passes `validatePassword()`.

---

## Groups

Groups represent small groups or ministry teams within a Ministry.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/groups` | `groups.view` | List groups (filter by ministryId, isActive) |
| GET | `/api/groups/:id` | `groups.view` | Get group with members and leaders |
| POST | `/api/groups` | `groups.edit` | Create a group |
| PUT | `/api/groups/:id` | `groups.edit` | Update a group |
| DELETE | `/api/groups/:id` | `groups.edit` | Delete a group (cascade deletes memberships) |
| POST | `/api/groups/:id/members` | `groups.edit` | Add a member to a group |
| DELETE | `/api/groups/:id/members/:memberId` | `groups.edit` | Remove a member |
| POST | `/api/groups/:id/leaders` | `groups.edit` | Add a leader (with optional role label) |
| DELETE | `/api/groups/:id/leaders/:memberId` | `groups.edit` | Remove a leader |

---

## Ministries

Ministries form a hierarchy (parentId self-reference). Ministry deletion is blocked if the
ministry has active groups or child ministries.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/ministries` | `groups.view` | List all ministries with parent/children/groups |
| GET | `/api/ministries/:id` | `groups.view` | Get a single ministry |
| POST | `/api/ministries` | `groups.edit` | Create a ministry |
| PUT | `/api/ministries/:id` | `groups.edit` | Update a ministry |
| DELETE | `/api/ministries/:id` | `groups.edit` | Delete (blocked if has groups or children) |

---

## Permission Keys

| Key | Grants |
|---|---|
| `admin.access` | Read and write all settings; access admin section |
| `groups.view` | View groups and ministries |
| `groups.edit` | Create, update, and delete groups and ministries; manage memberships |

The `requirePrimaryAdmin()` guard is separate from all permission keys and checks
`user.isPrimaryAdmin` directly on the JWT payload.

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/settings.ts` | Settings CRUD and public branding endpoint |
| `backend/src/routes/setup.ts` | Setup wizard steps, finalize, seed account management |
| `backend/src/routes/groups.ts` | Group CRUD, member and leader management |
| `backend/src/routes/ministries.ts` | Ministry hierarchy CRUD |
| `backend/src/middleware/auth.ts` | requirePrimaryAdmin middleware |
| `backend/prisma/schema.prisma` | Setting, Group, GroupMember, GroupLeader, Ministry models |
| `frontend/src/pages/setup/SetupWizardPage.tsx` | First-run setup wizard UI |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | Admin settings management UI |
