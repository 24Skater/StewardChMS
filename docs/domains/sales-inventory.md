# Sales and Inventory

## Overview

The Sales and Inventory domain manages a product catalog, stock level tracking via an append-only
transaction log, and a point-of-sale workflow. Deleting a product performs a soft delete
(isActive = false). Stock levels are computed by summing all transaction deltas rather than
maintaining a denormalized count column.

---

## Data Models

### Product

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | Required; unique |
| `description` | `String?` | Optional |
| `sku` | `String?` | Optional; unique when provided |
| `priceCents` | `Int` | Required; integer cents (e.g. 500 = $5.00) |
| `currency` | `String` | Default USD |
| `isActive` | `Boolean` | Default true; set false on soft delete |

### InventoryTransaction

Append-only ledger. Never modified or deleted; the current stock level is always the sum of all
`quantityDelta` values for a product.

| Field | Type | Notes |
|---|---|---|
| `productId` | `String` | FK to Product |
| `type` | enum | `adjustment`, `purchase`, `sale`, `return` |
| `quantityDelta` | `Int` | Positive = add stock; negative = remove stock |
| `note` | `String?` | Optional explanation |

### Sale

| Field | Type | Notes |
|---|---|---|
| `saleNumber` | `String` | Unique; format SALE-YYYY-NNNN |
| `memberId` | `String?` | Optional; null for guest sales |
| `guestName` | `String?` | Used when memberId is null |
| `status` | enum | `completed` or `void` |
| `subtotalCents` | `Int` | Sum of lineTotalCents for all items |
| `taxCents` | `Int` | Tax amount; default 0 |
| `totalCents` | `Int` | subtotalCents + taxCents |
| `soldAt` | `DateTime` | Timestamp of sale |

### SaleItem

One row per product line in a sale. The `unitPriceCents` is a price snapshot at time of sale,
not a FK to the current product price. This preserves historical accuracy.

| Field | Type | Notes |
|---|---|---|
| `saleId` | `String` | FK to Sale |
| `productId` | `String` | FK to Product (onDelete: Restrict) |
| `quantity` | `Int` | Units sold |
| `unitPriceCents` | `Int` | Price snapshot at time of sale |
| `lineTotalCents` | `Int` | quantity * unitPriceCents |

**The `onDelete: Restrict` constraint on SaleItem.productId** prevents a product from being
hard-deleted if it has ever appeared in a sale. Since the soft-delete pattern (isActive = false)
is used, this constraint should never be triggered in normal operation. It is a database-level safety net.

---

## API Endpoints

All endpoints require a valid JWT session cookie (`steward_session`).

### Products

**Base path:** `/api/products`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/products` | `inventory.edit` | Create a product |
| GET | `/api/products` | `inventory.view` | List products (filter by active=true/false) |
| GET | `/api/products/:id` | `inventory.view` | Get a single product |
| PUT | `/api/products/:id` | `inventory.edit` | Update a product |
| DELETE | `/api/products/:id` | `inventory.edit` | Soft delete (sets isActive = false) |

Error cases for POST and PUT:
- 409 if a product with the same name already exists
- 409 if a product with the same SKU already exists (when SKU is provided)

### Inventory

**Base path:** `/api/inventory`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/inventory/adjust` | `inventory.edit` | Create a manual inventory adjustment |
| GET | `/api/inventory/summary` | `inventory.view` | Current on-hand quantity per product |
| GET | `/api/inventory/transactions` | `inventory.view` | Transaction history (latest first, limit param) |

**POST /api/inventory/adjust request body:**

```json
{
  "productId": "cmp1...",
  "quantityDelta": 50,
  "note": "Initial stock receipt"
}
```

quantityDelta cannot be 0. Positive values add stock; negative values remove stock.

**GET /api/inventory/summary response:**

```json
{
  "inventory": [
    { "productId": "cmp1...", "productName": "Church T-Shirt", "sku": "TSHIRT-M", "priceCents": 1500, "isActive": true, "onHand": 47 }
  ]
}
```

### Sales

**Base path:** `/api/sales`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/api/sales` | `sales.edit` | Create a sale |
| GET | `/api/sales` | `sales.view` | List sales (filter by dateFrom, dateTo, status) |
| GET | `/api/sales/:id` | `sales.view` | Get a single sale with items |
| POST | `/api/sales/:id/void` | `sales.edit` | Void a completed sale |

**POST /api/sales request body:**

```json
{
  "memberId": "cmm1...",
  "taxCents": 0,
  "items": [
    { "productId": "cmp1...", "quantity": 2 }
  ]
}
```

Creating a sale:
1. All products are looked up and current prices are captured as snapshots.
2. Sale, SaleItem rows, and InventoryTransaction rows (type=sale, negative delta) are all created
   inside a single Prisma transaction.
3. The sale number is generated as SALE-YYYY-NNNN (sequential within year).

Voiding a sale reverses inventory (creates InventoryTransaction rows with type=return, positive delta)
and sets the sale status to void, all in a single transaction.

---

## Inventory Level Computation

There is no denormalized stock count on the Product row. Current on-hand inventory is always
computed on demand by summing all InventoryTransaction.quantityDelta values for a product:

```sql
SELECT productId, SUM(quantity_delta) AS on_hand
FROM inventory_transactions
GROUP BY productId
```

This is done via Prisma `groupBy` with `_sum` in GET /api/inventory/summary.
The result is merged with the product list on the application side.

---

## Permission Keys

| Key | Grants |
|---|---|
| `inventory.view` | View products and inventory levels |
| `inventory.edit` | Create/update products and adjust inventory |
| `sales.view` | View sales and sale items |
| `sales.edit` | Create sales and void sales |

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/products.ts` | Product CRUD |
| `backend/src/routes/inventory.ts` | Inventory adjustments and summary |
| `backend/src/routes/sales.ts` | Sale creation, listing, and void |
| `backend/prisma/schema.prisma` | Product, Sale, SaleItem, InventoryTransaction models |
