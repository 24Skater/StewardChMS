# StewardChMS Data Classification Matrix

**Version:** 1.0.0
**Date:** 2026-06-20
**Purpose:** CISO gate document required before Phase 1 design system migration (`@steward-apps/tokens`, `@steward-apps/ui`)
**Schema source:** `backend/prisma/schema.prisma`
**Frontend source:** `frontend/src/pages/`
**Permission source:** `backend/src/routes/`

---

## 1. PII Field Inventory

All fields enumerated directly from `backend/prisma/schema.prisma`.

### Model: User

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `email` | String (unique) | Identity / authentication credential | HIGH | requireAuth on all endpoints |
| `name` | String (optional) | Identity | MEDIUM | Authenticated staff only |
| `passwordHash` | String | Authentication secret | HIGH | Never returned in API responses; bcrypt hash stored only |

### Model: PasswordResetToken

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `tokenHash` | String (unique) | Authentication credential | HIGH | SHA-256 hashed before storage; raw token sent only via email |
| `userId` | String (FK) | Identity linkage | HIGH | Backend-only; not surfaced in API responses |

### Model: Member

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `firstName` | String | Identity | MEDIUM | members.read permission |
| `lastName` | String | Identity | MEDIUM | members.read permission |
| `email` | String (unique, optional) | Contact / identity | HIGH | members.read; uniqueness check leaks existence (see Section 2) |
| `phone` | String (optional) | Contact | HIGH | members.read permission |
| `street` | String (optional) | Physical address | HIGH | members.read permission |
| `city` | String (optional) | Physical address | MEDIUM | members.read permission |
| `state` | String (optional) | Physical address | LOW | members.read permission |
| `zip` | String (optional) | Physical address | MEDIUM | members.read permission |
| `dateOfBirth` | DateTime (optional) | Demographic / age | HIGH | members.read; see Section 3 for children |
| `notes` | String (optional) | Sensitive biographical | HIGH | Separate members.notes permission gate; enforced in frontend (canEditNotes) and backend |
| `profilePhotoUrl` | String (optional) | Biometric-adjacent | HIGH | members.read; see Section 3 for children |
| `isChild` | Boolean | Age classification | HIGH | members.read; determines COPPA applicability |
| `securityCode` | String (unique, optional) | Child custody control | CRITICAL | Authorizes child pickup; stored as plaintext; see Section 3 |
| `allergies` | String (optional) | Medical / health | CRITICAL | checkin.view; rendered on printed labels and kiosk screen |
| `medicalNotes` | String (optional) | Medical / health | CRITICAL | checkin.view; rendered on printed labels and admin table |
| `parentalNotes` | String (optional) | Family / custody | HIGH | checkin.view permission |

### Model: Registration

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `guestName` | String (optional) | Identity | MEDIUM | events.read permission |
| `guestEmail` | String (optional) | Contact | HIGH | events.read permission |
| `guestPhone` | String (optional) | Contact | HIGH | events.read permission |

### Model: Donation

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `amountCents` | Integer | Financial | HIGH | giving.view permission |
| `guestName` | String (optional) | Identity | MEDIUM | giving.view permission |
| `guestEmail` | String (optional) | Contact | HIGH | giving.view permission |
| `note` | String (optional) | Free-text / biographical | MEDIUM | giving.view; no database-level length constraint |
| `stripePaymentIntentId` | String (unique, optional) | Payment processor reference | HIGH | Backend-only; PCI-adjacent (see Section 4) |
| `stripeChargeId` | String (unique, optional) | Payment processor reference | HIGH | Backend-only; PCI-adjacent (see Section 4) |
| `stripeStatus` | String (optional) | Transaction state | MEDIUM | giving.view permission |
| `method` | Enum | Payment method | MEDIUM | giving.view permission |

### Model: Pledge

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `amountCents` | Integer | Financial commitment | HIGH | giving.view permission |
| `memberId` | String (FK) | Identity linkage to financial record | HIGH | giving.view permission |

### Model: Vendor

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `email` | String (optional) | Business contact | MEDIUM | accounting.view permission |
| `phone` | String (optional) | Business contact | MEDIUM | accounting.view permission |
| `street` / `city` / `state` / `zip` | String (optional) | Business address | LOW | accounting.view permission |

### Model: AuditLog

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `actorUserId` | String (optional FK) | Identity linkage | HIGH | Admin-only; contains full action trail |
| `metadata` | JSON | Names and emails per action type | HIGH | Admin-only; MEMBER_CREATED entries embed firstName/lastName |

### Model: MessageRecipient

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `guestContact` | JSON | Contact data for non-members | HIGH | communications.view permission |
| `errorMessage` | String (optional) | Delivery error; may contain email address | MEDIUM | communications.view permission |

### Model: MinistryCalendar

| Field | Data Type | PII Category | Sensitivity | Access Control |
|-------|-----------|--------------|-------------|----------------|
| `shareToken` | String (unique) | Access control credential | HIGH | Public schedule URL token; treat as a secret |

---

## 2. Sensitive Data in Error States

Files reviewed: MemberFormPage.tsx, KioskModePage.tsx, DonationFormPage.tsx, GivingPortalPage.tsx, backend/src/routes/members.ts, backend/src/routes/kids-checkin.ts, backend/src/routes/online-giving.ts, backend/src/routes/auth.ts

### Finding 2.1 - Member Email Existence Oracle (MEDIUM)

**File:** `backend/src/routes/members.ts`, line 213 (POST /api/members) and line 291 (PUT /api/members/:id)

**Behavior:** Duplicate email submission returns HTTP 409 with body: A member with this email already exists.

**Threat:** Any authenticated user with members.write permission can enumerate whether a specific email belongs to a member record. In a church context this links email addresses to congregation membership -- biographical data the subject may not have disclosed publicly.

**Recommendation:** Return a generic conflict message that does not confirm the email is the source of the collision.

### Finding 2.2 - Member Email Import Oracle (MEDIUM)

**File:** `backend/src/routes/members.ts`, line 436 (POST /api/members/import)

**Behavior:** The import error array returns verbatim: Email [address] already exists, embedding the submitted email in the structured response returned to the client.

**Threat:** Batch enumeration of member email existence. The full set of failed emails with their conflict status is returned in one structured response.

**Recommendation:** Replace with a generic message that does not echo the email value.

### Finding 2.3 - Kids Kiosk Demo Fallback Exposes Child PII (HIGH)

**File:** `frontend/src/pages/kids-checkin/KioskModePage.tsx`, lines 151-155

**Behavior:** On phone lookup failure, a catch block falls back to GET /kids-checkin/children and renders the first 5 results. This code is labeled for demo purposes. The allergy indicator (`child.allergies`) is present in the response object and rendered at line 319.

**Threat:** Any person at a kiosk terminal who triggers a lookup failure receives a list of up to 5 children by name, with allergy indicators, without any verified parent identity.

**Recommendation:** Remove this fallback block entirely before any deployment with real children.

### Finding 2.4 - Kiosk Auth Mismatch: Frontend Drops Token, Backend Requires Auth (HIGH)

**File:** `backend/src/routes/kids-checkin.ts` line 9; `KioskModePage.tsx` lines 112, 141, 187

**Behavior:** The backend applies router.use(requireAuth) to all routes. The kiosk frontend passes { auth: false } to apiRequest on every call, meaning no authentication token is sent.

**Threat:** As deployed, the kiosk either cannot function (receives 401) or functions because kiosk devices are left permanently logged in as a staff account. A shared, persistent staff session on a public-facing terminal is an uncontrolled authentication state.

**Recommendation:** Implement a dedicated kiosk authentication mode that limits API access to check-in and check-out operations only before production use.

### Finding 2.5 - DonationFormPage Uses alert() and Raw console.error (MEDIUM)

**File:** `frontend/src/pages/giving/DonationFormPage.tsx`, lines 99-101

**Behavior:** console.error logs the raw error object to the browser console. alert() is the user-facing response.

**Threat:** Raw API error objects in console output can expose internal field names, database error messages, or stack traces to anyone with devtools access on a shared terminal.

**Recommendation:** Replace with the structured in-form error pattern used in MemberFormPage.tsx. Remove or gate console.error in production builds.

---

## 3. Children's Data - Heightened Classification

The following Member model fields apply when isChild = true.

| Field | Classification | Notes |
|-------|---------------|-------|
| `firstName`, `lastName` | Child Identity - CRITICAL | Combined with isChild = true, this identifies a named minor |
| `dateOfBirth` | Child Age Data - CRITICAL | Directly confirms age of a minor; COPPA indicator |
| `allergies` | Child Health Data - CRITICAL | Printed on labels (KioskModePage.tsx lines 57-60); displayed on kiosk confirmation at line 362; shown in admin table at KidsCheckinPage.tsx lines 248-251 |
| `medicalNotes` | Child Health Data - CRITICAL | Printed on labels; displayed in admin table at KidsCheckinPage.tsx lines 253-256 |
| `parentalNotes` | Custody / Family Data - HIGH | Returned in GET /api/kids-checkin/children response |
| `profilePhotoUrl` | Child Biometric-Adjacent - HIGH | Returned in GET /api/kids-checkin/children response |
| `securityCode` | Child Custody Control - CRITICAL | Authorizes child pickup; stored as plaintext in the members table |

### COPPA Assessment

StewardChMS stores dateOfBirth and isChild flags that explicitly identify minors. For US-based deployments, COPPA (15 U.S.C. 6501 et seq.) is the applicable framework. The kids check-in system is an internal staff tool, generally outside COPPA direct operator obligations, but the data must be treated with equivalent care.

**Critical gap:** Member.securityCode is stored as plaintext. Any database read exposure -- backup, misconfigured query log, analytics export, SQL injection -- yields child pickup authorization codes for all enrolled children. This field should be hashed or rotated per session.

**Critical gap:** Allergy and medical data prints onto physical labels. Label security (who receives a copy, how labels are disposed) is outside system scope but must be addressed in operational policy before launch.

**Documentation gap:** No consent capture workflow exists for parental consent to store children health data. This must be established before the system processes real children records.

---

## 4. Financial Data - PCI-Adjacent Fields

StewardChMS uses Stripe Elements for card capture. No raw cardholder data transits the application server. GivingPortalPage.tsx uses @stripe/react-stripe-js PaymentElement, which sends card data directly to Stripe.

| Model | Field | Classification | Risk |
|-------|-------|---------------|------|
| Donation | `stripePaymentIntentId` | PCI-Adjacent - HIGH | References a Stripe charge; links member identity to a payment event |
| Donation | `stripeChargeId` | PCI-Adjacent - HIGH | Same risk profile |
| Donation | `amountCents` | Financial record - HIGH | Member giving history linked by memberId |
| Donation | `method` | Payment method - MEDIUM | Enum value only; no account details |
| Donation | `stripeStatus` | Transaction state - MEDIUM | |
| Pledge | `amountCents` | Financial commitment - HIGH | Member pledge linked by memberId |
| Invoice | `subtotalCents`, `totalCents` | Financial record - MEDIUM | |
| PurchaseOrder | `subtotalCents`, `totalCents` | Financial record - MEDIUM | |

### PCI-DSS Scope Assessment

Because card input is handled exclusively by Stripe Elements client-side, StewardChMS operates in reduced PCI scope (SAQ A eligible for the online giving flow). This holds only if:

1. STRIPE_SECRET_KEY is never committed to source control or emitted in application logs.
2. Stripe webhook signature verification remains enforced. Confirmed: backend/src/routes/online-giving.ts line 197 calls stripeInstance.webhooks.constructEvent() with the stripe-signature header and webhook secret.
3. No future change routes raw card data through the application server.

**Note:** Donation.note is an unconstrained free-text field with no @db.VarChar limit in the Prisma schema and only z.string() (no .max()) in the API schema. Apply a character limit and add UI copy noting this field appears on internal records.

---

## 5. License Compatibility Check

### CRITICAL - Runtime Dependency Without Integrity Verification

**File:** `frontend/package.json`, line 42
**Entry:** steward-brand: github:24Skater/steward-brand#main

This is a production runtime dependency resolved directly from a GitHub repository branch reference. There is no version pin, no npm registry integrity hash, and no lockfile protection that prevents the dependency from changing on every fresh install. The reference #main is a moving pointer.

**Threat model:** Any commit pushed to github.com/24Skater/steward-brand on the main branch is silently incorporated into every fresh install of StewardChMS. A compromised maintainer account, repository takeover, or malicious PR merged to main delivers arbitrary JavaScript to every deployment, executed with full DOM access and exposure to all PII in the UI: member names, children medical data, donation amounts, and child security codes.

This is a CRITICAL blocking finding. The migration to versioned @steward-apps/tokens and @steward-apps/ui packages must eliminate this dependency as its primary deliverable. The replacement packages must be published to npm with explicit version pins and lockfile integrity -- not installed from a GitHub branch reference.

### Frontend: All Other Dependencies

All other declared frontend dependencies carry MIT or ISC licenses. No GPL, AGPL, or non-commercial licenses identified.

### Backend Dependencies

| Package | License | Notes |
|---------|---------|-------|
| `express` | MIT | |
| `@prisma/client`, `prisma` | Apache-2.0 | Permissive |
| `bcryptjs` | MIT | |
| `jsonwebtoken` | MIT | |
| `stripe` | MIT | |
| `zod` | MIT | |
| `helmet`, `express-rate-limit`, `cookie-parser`, `cors` | MIT | |

No GPL, AGPL, or non-commercial licenses identified in the backend.

**Incidental finding:** vite (version 7.3.1) appears in backend/package.json under dependencies (not devDependencies). Vite is a frontend build tool with no runtime role in an Express server. Remove it from backend production dependencies.

---

## 6. Migration Risk Assessment

The migration replaces steward-brand CSS custom properties (--st-*) with @steward-apps/tokens and @steward-apps/ui. Every page reviewed consumes the design system exclusively through CSS custom properties on text, background, and border styling. No PII is interpolated into CSS variable values.

### Surfaces Rendering PII That Migration Must Not Regress

| Surface | File | PII Rendered | Migration Risk |
|---------|------|-------------|----------------|
| Member form error alert | MemberFormPage.tsx line 144 | API error string from createMutation.error?.data?.error | LOW - error text is API-controlled; CSS change does not affect content |
| Kids kiosk confirmation screen | KioskModePage.tsx line 362 | selectedChild.allergies in a red alert box | MEDIUM - uses var(--st-color-danger) background; this is a safety indicator; migration must preserve a high-contrast danger surface |
| Kids kiosk printed label | KioskModePage.tsx lines 44-72 | Child name, security code, allergies, medical notes | LOW - Label component uses only inline styles and Tailwind classes; no --st-* tokens; confirm isolation is preserved post-migration |
| Admin check-in roster table | KidsCheckinPage.tsx lines 362-399 | Child name, security code, allergy badge, medical badge | MEDIUM - badges use var(--st-color-danger) and var(--st-color-warning); migration must map or preserve these semantic color tokens |
| Giving portal success state | GivingPortalPage.tsx line 404 | Donor email address | LOW - plain text; no component concern |

### Toast and Notification Patterns

If @steward-apps/ui introduces a toast or notification component for mutation success/error messages, verify before shipping:

1. Member names must not be interpolated into success toasts.
2. Donation amounts must not be surfaced in DOM-persistent toast elements readable by browser extensions.
3. API error responses surfaced via toast must not echo PII-containing validation error details.

---

## 7. Gate Verdict

**VERDICT: BLOCK**

The migration may not proceed to production in its current state.

### Blocking Conditions - Must Resolve Before Migration Ships

**B-1 - CRITICAL:** frontend/package.json line 42 declares steward-brand as a production runtime dependency via github:24Skater/steward-brand#main with no version pin and no integrity verification. Removing it and replacing it with versioned, registry-published @steward-apps/tokens and @steward-apps/ui packages is the primary deliverable of the migration. The replacement packages must not themselves be installed from a GitHub branch reference.

**B-2 - HIGH:** The demo fallback in KioskModePage.tsx lines 151-155 fetches and displays children names and allergy data without confirming parent identity. Remove before any deployment with real children data.

**B-3 - HIGH:** The kiosk API authentication mismatch ({ auth: false } in frontend vs. router.use(requireAuth) in backend) means the kiosk either cannot function or runs via a persistent shared staff session on a public-facing terminal. Implement a scoped kiosk authentication mode before production deployment.

### Conditions for Clearance Within 30 Days

**C-1 - MEDIUM:** Replace existence-confirming error messages in backend/src/routes/members.ts at lines 213, 291, and 436 with generic conflict messages that do not echo the email value or confirm it is the source of conflict.

**C-2 - MEDIUM:** Remove vite from backend/package.json production dependencies.

**C-3 - MEDIUM:** Replace alert() and unguarded console.error(error) in DonationFormPage.tsx lines 99-101 with structured in-form error handling.

**C-4 - MEDIUM:** Establish operational policy for children data before launch: parental consent capture, physical label disposal procedures, and kiosk device session management.

### Conditions to Address Next Cycle

**D-1 - LOW:** Hash or rotate-per-session Member.securityCode. Plaintext storage means any database read exposure yields child pickup authorization codes for all enrolled children.

**D-2 - LOW:** Add a character limit and a UI disclosure note to Donation.note.

**D-3 - LOW:** Verify the migrated @steward-apps/ui component set does not introduce toast or notification patterns that surface member names or donation amounts in DOM-persistent elements readable by browser extensions.

---

All findings are based on direct reading of source files at the commits present in the repository at the time of this review. Re-verify against current code at the time of migration execution.