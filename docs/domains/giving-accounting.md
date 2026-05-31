# Giving & Accounting Domain

## Overview

This domain covers two related but distinct concerns:

**Giving** - money coming in:
- **Online Giving Portal** (`/give`) - a public, unauthenticated Stripe-powered donation page accessible to anyone.
- **Internal Donation Recording** - staff record cash, check, card, or ACH donations received in person.
- **Pledges** - member commitments to give a total amount over a date range.

**Accounting** - money going out and general ledger:
- **Funds** - named buckets that designate how money is used (e.g., General, Building, Missions).
- **Expenses** - individual expenditures linked to a vendor and/or fund.
- **Vendors** - suppliers and service providers.
- **Invoices** - itemized bills issued by or to the church, with line items.
- **Purchase Orders** - approval-workflow documents for planned expenditures.

---

## Data Models

### Donation

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| memberId | String? | FK to Member (null for anonymous or guest donations) |
| guestName | String? | Donor name when not linked to a member |
| guestEmail | String? | Guest donor email |
| amountCents | Int | Donation amount in smallest currency unit (cents for USD) |
| currency | String | ISO 4217 code. Default USD |
| fundId | String? | FK to Fund. Null means undesignated/general |
| method | PaymentMethod | Enum - see below |
| receivedAt | DateTime | When the donation was received |
| note | String? | Optional note, max 500 chars |
| stripePaymentIntentId | String? | Unique. Set for online donations processed through Stripe |
| stripeChargeId | String? | Unique. Set when Stripe confirms the charge |
| stripeStatus | String? | Mirrors Stripe PaymentIntent status (succeeded, failed, etc.) |
| isOnline | Boolean | true for donations created via Stripe webhook. Default false |
| createdAt | DateTime | Auto-set |

**PaymentMethod enum values:**

| Value | Meaning |
|---|---|
| cash | Physical currency |
| check | Paper check |
| card | Credit or debit card (manually recorded) |
| online | Stripe-processed online donation |
| other | Any other method |

### Fund

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Unique, max 100 chars |
| description | String? | Max 500 chars |
| isRestricted | Boolean | true for donor-restricted funds. Default false |
| isActive | Boolean | false hides from online giving dropdown. Default true |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |

Funds with linked donations, pledges, or expenses cannot be deleted (409 returned with dependency counts).

### Pledge

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| memberId | String | Required FK to Member |
| fundId | String? | Optional FK to Fund |
| amountCents | Int | Total pledge commitment in cents |
| startDate | DateTime? | Beginning of pledge period |
| endDate | DateTime? | End of pledge period |
| status | PledgeStatus | Enum: active, completed, canceled. Default active |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |

> Pledge fulfillment tracking: The schema stores the total commitment (amountCents) but no fulfilledCents field on the Pledge record. Fulfillment progress must be calculated by querying donations for the same member and fund within the pledge period.

### Vendor

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Unique, max 100 chars |
| email | String? | Contact email |
| phone | String? | Contact phone, max 20 chars |
| street | String? | Street address |
| city | String? | City |
| state | String? | State |
| zip | String? | Postal code |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |

Vendors with linked expenses, invoices, or purchase orders cannot be deleted (409 with counts).

### Expense

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| vendorId | String? | Optional FK to Vendor |
| fundId | String? | Optional FK to Fund |
| amountCents | Int | Amount in cents |
| currency | String | Default USD |
| expenseDate | DateTime | Required date of expense |
| category | String? | Free-form tag, max 100 chars |
| note | String? | Max 500 chars |
| createdAt | DateTime | Auto-set |

### Invoice

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| invoiceNumber | String | Unique. Auto-generated as INV-YYYY-NNNN |
| vendorId | String? | Optional FK to Vendor |
| billToName | String? | Free-form recipient name, max 200 chars |
| issueDate | DateTime | Required |
| dueDate | DateTime? | Optional payment due date |
| status | InvoiceStatus | Enum: draft, sent, paid, void. Default draft |
| subtotalCents | Int | Sum of line item totals. Auto-maintained by item create/update/delete |
| taxCents | Int | Tax amount in cents. Default 0 |
| totalCents | Int | subtotalCents + taxCents. Auto-maintained |
| note | String? | Max 1000 chars |

**InvoiceItem fields:** description (max 500), quantity (Float), unitPriceCents (Int), lineTotalCents (auto-computed), sortOrder (auto-assigned).

### PurchaseOrder

| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| poNumber | String | Unique. Auto-generated as PO-YYYY-NNNN |
| vendorId | String? | Optional FK to Vendor |
| requestorUserId | String? | FK to User who created the PO (auto-set) |
| issueDate | DateTime | Required |
| status | PurchaseOrderStatus | Enum: draft, submitted, approved, rejected, closed, void |
| subtotalCents | Int | Auto-maintained |
| taxCents | Int | Default 0 |
| totalCents | Int | Auto-maintained |
| note | String? | Max 1000 chars |

PurchaseOrder line items (PurchaseOrderItem) have the same schema as InvoiceItem.

---

## Online Giving Portal

### Public Route

The giving portal is mounted at `/give` as a public route in `App.tsx`, not wrapped in `ProtectedRoute`. A thank-you page is at `/give/thank-you`.

### Stripe Payment Flow



### GivingPortalPage Steps

The portal is a 4-step wizard:

1. **Amount Selection** - six suggested amounts (5, 0, 00, 50, 00, ,000) plus a custom amount input. A fund selector appears if active funds exist. Minimum donation is .00 (100 cents).
2. **Donor Details** - name (optional), email (required for receipt), and an optional note.
3. **Payment** - Stripe `Elements` component renders `PaymentElement`. On submit, `stripe.confirmPayment()` is called with `redirect: "if_required"`. If Stripe confirms without redirect, the success handler is called immediately.
4. **Success** - shows the donation amount and confirms a receipt was sent to the donor email.

### Graceful Degradation

The portal fetches `GET /api/online-giving/config` on mount. This returns `stripePublicKey` and `givingEnabled` from the settings table. If either `givingEnabled` is `false` or `stripePublicKey` is null/missing, the portal renders a message stating that online giving is currently unavailable, rather than crashing or showing an error state.

### Webhook

The `POST /api/online-giving/webhook` endpoint receives Stripe events. It requires the raw request body (not JSON-parsed) for signature verification using `STRIPE_WEBHOOK_SECRET`. On `payment_intent.succeeded`:

1. Checks whether a `Donation` with that `stripePaymentIntentId` already exists.
2. If it exists, updates `stripeStatus` and `stripeChargeId`.
3. If it does not exist, creates a new `Donation` record using metadata stored on the PaymentIntent (`fundId`, `memberId`, `donorName`, `donorEmail`, `note`).

On `payment_intent.payment_failed`, `stripeStatus` is updated to `"failed"` on any matching donation.

---

## API Endpoints

### Online Giving (`/api/online-giving`)

#### `GET /api/online-giving/config` (public)

Fetch configuration for the giving portal. No auth required.

**Response 200:**



Values are read from the `settings` table (category/key pairs: `stripe/public_key`, `giving/online_enabled`, `branding/church_name`).

---

#### `POST /api/online-giving/create-payment-intent` (public)

Create a Stripe PaymentIntent. No auth required.

**Request body:**



`amountCents` is required (min 100 = .00). All other fields are optional. Fund and member IDs are validated to exist before creating the PaymentIntent. Metadata is attached to the Stripe PaymentIntent for use by the webhook.

**Response 200:**



**Errors:** `400` validation or invalid fund/member; `503` Stripe not configured; `500` other errors

---

#### `POST /api/online-giving/webhook` (public, Stripe signature required)

Handle Stripe webhook events. Requires raw body and `stripe-signature` header. Verified using `STRIPE_WEBHOOK_SECRET`.

**Handled events:** `payment_intent.succeeded`, `payment_intent.payment_failed`

**Response 200:** `{ "received": true }`

**Errors:** `400` missing or invalid signature; `503` Stripe not configured; `500` webhook secret missing

---

#### `GET /api/online-giving/stats` (authenticated)

Online giving statistics for the current month and year.

**Permission:** `giving.view`

**Response 200:**



Only `succeeded` Stripe donations are counted.

---

### Donations (`/api/donations`)

#### `GET /api/donations`

**Permission:** `giving.view`

**Query parameters:** `dateFrom`, `dateTo` (ISO strings), `fundId`, `memberId`, `page` (default 1), `limit` (default 20, max 100)

**Response 200:** `{ donations: Donation[], total, page, limit, totalPages }`. Each donation includes nested `member` (id, firstName, lastName) and `fund` (id, name) objects.

---

#### `GET /api/donations/:id`

**Permission:** `giving.view`

**Errors:** `404` not found

---

#### `POST /api/donations`

**Permission:** `giving.edit`

**Request body:**



Member and fund IDs (if provided) are validated to exist.

**Response 201:** Created donation object.

**Audit log:** `CREATE_DONATION`

---

#### `PUT /api/donations/:id`

**Permission:** `giving.edit`

All fields optional. Member and fund validated if changed.

**Errors:** `404` not found; `400` member or fund not found

**Audit log:** `UPDATE_DONATION`

---

#### `DELETE /api/donations/:id`

**Permission:** `giving.edit`

**Response 200:** `{ "message": "Donation deleted successfully" }`

**Errors:** `404` not found

**Audit log:** `DELETE_DONATION`

---

### Funds (`/api/funds`)

#### `GET /api/funds`

**Permission:** `accounting.view`

Returns all funds ordered by name. No pagination.

**Response 200:** `{ funds: Fund[], total }`

---

#### `GET /api/funds/:id`

**Permission:** `accounting.view`

**Errors:** `404` not found

---

#### `POST /api/funds`

**Permission:** `accounting.edit`

**Request body:** `{ name, description?, isRestricted? }`

**Errors:** `400` validation; `409` fund name already exists

**Audit log:** `CREATE_FUND`

---

#### `PUT /api/funds/:id`

**Permission:** `accounting.edit`

**Errors:** `404` not found; `409` name conflict

**Audit log:** `UPDATE_FUND`

---

#### `DELETE /api/funds/:id`

**Permission:** `accounting.edit`

**Errors:** `404` not found; `409` fund has linked donations/pledges/expenses (returns counts)

**Audit log:** `DELETE_FUND`

---

### Pledges (`/api/pledges`)

All pledge endpoints require a valid session.

#### `GET /api/pledges`

**Permission:** `giving.view`

**Query parameters:** `status` (active/completed/canceled), `memberId`, `fundId`, `page`, `limit`

**Response 200:** `{ pledges, total, page, limit, totalPages }`

---

#### `GET /api/pledges/:id`

**Permission:** `giving.view`

**Errors:** `404` not found

---

#### `POST /api/pledges`

**Permission:** `giving.edit`

**Request body:** `{ memberId, amountCents, fundId?, startDate?, endDate?, status? }`

Member and fund validated to exist.

**Response 201:** Created pledge.

**Audit log:** `CREATE_PLEDGE`

---

#### `PUT /api/pledges/:id`

**Permission:** `giving.edit`

**Audit log:** `UPDATE_PLEDGE`

---

#### `DELETE /api/pledges/:id`

**Permission:** `giving.edit`

**Audit log:** `DELETE_PLEDGE`

---

### Expenses (`/api/expenses`)

#### `GET /api/expenses`

**Permission:** `accounting.view`

**Query parameters:** `dateFrom`, `dateTo`, `fundId`, `vendorId`, `page`, `limit`

---

#### `GET /api/expenses/:id`

**Permission:** `accounting.view`

**Errors:** `404` not found

---

#### `POST /api/expenses`

**Permission:** `accounting.edit`

**Request body:** `{ amountCents, expenseDate, vendorId?, fundId?, currency?, category?, note? }`

Vendor and fund validated if provided.

**Audit log:** `CREATE_EXPENSE`

---

#### `PUT /api/expenses/:id`

**Permission:** `accounting.edit`

**Audit log:** `UPDATE_EXPENSE`

---

#### `DELETE /api/expenses/:id`

**Permission:** `accounting.edit`

**Audit log:** `DELETE_EXPENSE`

---

### Vendors (`/api/vendors`)

#### `GET /api/vendors`

**Permission:** `accounting.view`

All vendors, ordered by name. No pagination.

---

#### `GET /api/vendors/:id`

**Permission:** `accounting.view`

**Errors:** `404` not found

---

#### `POST /api/vendors`

**Permission:** `accounting.edit`

**Request body:** `{ name, email?, phone?, street?, city?, state?, zip? }`

**Errors:** `409` vendor name already exists

**Audit log:** `CREATE_VENDOR`

---

#### `PUT /api/vendors/:id`

**Permission:** `accounting.edit`

**Errors:** `404` not found; `409` name conflict

**Audit log:** `UPDATE_VENDOR`

---

#### `DELETE /api/vendors/:id`

**Permission:** `accounting.edit`

**Errors:** `404` not found; `409` vendor has linked expenses/invoices/purchase orders (returns counts)

**Audit log:** `DELETE_VENDOR`

---

### Invoices (`/api/invoices`)

Invoice numbers are auto-generated as `INV-YYYY-NNNN` (zero-padded 4-digit sequence, restarting each year). Invoice and item totals are kept in sync by the API - do not set them directly.

#### `GET /api/invoices`

**Permission:** `accounting.view`

**Query parameters:** `status` (draft/sent/paid/void), `vendorId`, `page`, `limit`

**Response 200:** `{ invoices, total, page, limit, totalPages }`. Each invoice includes its vendor and all items ordered by `sortOrder`.

---

#### `GET /api/invoices/:id`

**Permission:** `accounting.view`

**Errors:** `404` not found

---

#### `POST /api/invoices`

**Permission:** `accounting.edit`

**Request body:**



Items can be included at creation time or added later via the items sub-endpoint. `subtotalCents` and `totalCents` are computed from items.

**Response 201:** Invoice object with items and totals.

**Audit log:** `CREATE_INVOICE`

---

#### `PUT /api/invoices/:id`

**Permission:** `accounting.edit`

Updates header fields (not items). If `taxCents` changes, totals are recalculated from existing items.

**Audit log:** `UPDATE_INVOICE`

---

#### `DELETE /api/invoices/:id`

**Permission:** `accounting.edit`

Cascades delete all line items.

**Audit log:** `DELETE_INVOICE`

---

#### `POST /api/invoices/:id/items`

Add a line item to an invoice. Updates invoice totals in a Prisma transaction.

**Permission:** `accounting.edit`

**Request body:** `{ description, quantity, unitPriceCents, sortOrder? }`

**Response 201:** Created InvoiceItem.

**Errors:** `404` invoice not found

---

#### `PUT /api/invoices/items/:itemId`

Update a line item. Recalculates `lineTotalCents` and propagates the diff to invoice totals in a Prisma transaction.

**Permission:** `accounting.edit`

**Errors:** `404` item not found

---

#### `DELETE /api/invoices/items/:itemId`

Remove a line item and subtract its total from invoice totals (Prisma transaction).

**Permission:** `accounting.edit`

**Errors:** `404` item not found

---

### Purchase Orders (`/api/purchase-orders`)

PO numbers are auto-generated as `PO-YYYY-NNNN`. The `requestorUserId` is set automatically to the authenticated user who creates the PO.

The PO status lifecycle: `draft` -> `submitted` -> `approved` (or `rejected`) -> `closed` (or `void`). Status transitions are not enforced by the API - the status field can be set to any valid value on any PUT.

#### `GET /api/purchase-orders`

**Permission:** `accounting.view`

**Query parameters:** `status`, `vendorId`, `page`, `limit`

**Response 200:** Each PO includes vendor, requestorUser, and items.

---

#### `GET /api/purchase-orders/:id`

**Permission:** `accounting.view`

**Errors:** `404` not found

---

#### `POST /api/purchase-orders`

**Permission:** `accounting.edit`

**Request body:** `{ issueDate, vendorId?, status?, taxCents?, note?, items? }`

`requestorUserId` is set to `req.user.userId` automatically.

**Audit log:** `CREATE_PURCHASE_ORDER`

---

#### `PUT /api/purchase-orders/:id`

**Permission:** `accounting.edit`

Updates header fields. If `taxCents` changes, totals are recalculated.

**Audit log:** `UPDATE_PURCHASE_ORDER`

---

#### `DELETE /api/purchase-orders/:id`

**Permission:** `accounting.edit`

**Audit log:** `DELETE_PURCHASE_ORDER`

---

#### `POST /api/purchase-orders/:id/items`

Add a line item. Totals updated in a Prisma transaction.

**Permission:** `accounting.edit`

**Request body:** `{ description, quantity, unitPriceCents, sortOrder? }`

---

#### `PUT /api/purchase-orders/items/:itemId`

Update a line item. Diff propagated to PO totals.

**Permission:** `accounting.edit`

---

#### `DELETE /api/purchase-orders/items/:itemId`

Remove item and update PO totals.

**Permission:** `accounting.edit`

---

## Frontend Pages

| Route | Component | Auth Required | Purpose |
|---|---|---|---|
| `/give` | `GivingPortalPage` | No | Public online donation wizard |
| `/give/thank-you` | `ThankYouPage` | No | Post-donation thank you (Stripe redirect target) |
| `/giving` | `DonationsPage` | Yes | Internal donation list |
| `/giving/new` | `DonationFormPage` | Yes | Record a new donation manually |
| `/giving/:id/edit` | `DonationFormPage` | Yes | Edit a donation |
| `/pledges` | `PledgesPage` | Yes | Pledge list |
| `/pledges/new` | `PledgeFormPage` | Yes | Create a pledge |
| `/pledges/:id/edit` | `PledgeFormPage` | Yes | Edit a pledge |
| `/funds` | `FundsPage` | Yes | Fund list and management |
| `/vendors` | `VendorsPage` | Yes | Vendor list |
| `/expenses` | `ExpensesPage` | Yes | Expense list |
| `/expenses/new` | `ExpenseFormPage` | Yes | Record an expense |
| `/expenses/:id/edit` | `ExpenseFormPage` | Yes | Edit an expense |
| `/invoices` | `InvoicesPage` | Yes | Invoice list |
| `/invoices/new` | `InvoiceFormPage` | Yes | Create invoice |
| `/invoices/:id` | `InvoiceDetailPage` | Yes | Invoice detail with line items |
| `/purchase-orders` | `PurchaseOrdersPage` | Yes | PO list |
| `/purchase-orders/new` | `PurchaseOrderFormPage` | Yes | Create PO |
| `/purchase-orders/:id` | `PurchaseOrderDetailPage` | Yes | PO detail with line items |
| `/reports/financial-dashboard` | `FinancialDashboardPage` | Yes | Aggregate financial overview |
| `/reports/finance` | `FinanceReportsPage` | Yes | Detailed financial reports |
| `/reports/giving` | `GivingReportPage` | Yes | Giving-specific reports |

---

## Permission Keys

| Key | Endpoints gated |
|---|---|
| `giving.view` | `GET /api/donations`, `GET /api/donations/:id`, `GET /api/pledges`, `GET /api/pledges/:id`, `GET /api/online-giving/stats` |
| `giving.edit` | `POST/PUT/DELETE /api/donations`, `POST/PUT/DELETE /api/pledges` |
| `accounting.view` | `GET /api/funds`, `GET /api/funds/:id`, `GET /api/expenses`, `GET /api/expenses/:id`, `GET /api/vendors`, `GET /api/vendors/:id`, `GET /api/invoices`, `GET /api/invoices/:id`, `GET /api/purchase-orders`, `GET /api/purchase-orders/:id` |
| `accounting.edit` | All POST/PUT/DELETE for funds, expenses, vendors, invoices, invoice items, purchase orders, purchase order items |

> The online-giving public endpoints (`/config`, `/create-payment-intent`, `/webhook`) require no authentication.
