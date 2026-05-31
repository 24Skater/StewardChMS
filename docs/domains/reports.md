# Reports and Analytics

## Overview

The Reports domain provides pre-built aggregate reports for membership, attendance, giving, sales,
and financial overview. Reports support JSON and CSV response formats. The financial dashboard
provides a year-over-year view with month-by-month charts rendered via Recharts.
PDF generation is handled client-side via jsPDF for invoices, purchase orders, and donor statements.

---

## Report Endpoints

All endpoints require a valid JWT session cookie (`steward_session`).

**Base path:** `/api/reports`

| Path | Permission | Required Params | Description |
|---|---|---|---|
| GET /reports/membership-summary | `reports.view` | dateFrom, dateTo | Members by status, new members, missing contact |
| GET /reports/attendance-summary | `reports.view` | dateFrom, dateTo | Check-ins by occurrence, top events |
| GET /reports/giving-report | `reports.view` | dateFrom, dateTo | Fund totals and donation counts (no donor names) |
| GET /reports/funds-summary | `accounting.view` | dateFrom, dateTo | Fund income vs expenses vs net |
| GET /reports/giving-summary | `giving.view` | dateFrom, dateTo | Per-donor giving totals (with member names) |
| GET /reports/donor-statement | `giving.view` | memberId, year | Itemized annual giving for one member |
| GET /reports/sales-summary | `reports.view` | dateFrom, dateTo | Sales totals and top products |
| GET /reports/financial-overview | `accounting.view` | year | YTD giving/expenses, monthly chart data, giving by fund |
| GET /reports/volunteer-summary | `reports.view` | none | Placeholder; returns a not-implemented message |

All date range endpoints require `dateFrom` and `dateTo` as ISO 8601 date strings.
Reports that support CSV export accept an additional `format=csv` query param.

---

## Report Response Shapes

### GET /reports/membership-summary

```json
{
  "dateFrom": "2026-01-01T00:00:00.000Z",
  "dateTo": "2026-12-31T00:00:00.000Z",
  "byStatus": { "active": 120, "inactive": 30, "visitor": 15 },
  "newMembersInPeriod": 12,
  "missingFields": { "email": 4, "phone": 7 },
  "totalMembers": 165
}
```

### GET /reports/financial-overview

```json
{
  "year": 2026,
  "monthly": [
    { "month": "Jan", "givingCents": 1500000, "expensesCents": 800000, "netCents": 700000 },
    ...
  ],
  "givingByFund": [
    { "fundName": "General Fund", "totalCents": 8500000, "percentage": 72.3 }
  ],
  "summary": {
    "ytdGivingCents": 11750000,
    "ytdExpensesCents": 9800000,
    "ytdNetCents": 1950000
  }
}
```

---

## Financial Dashboard

The financial dashboard at `frontend/src/pages/reports/FinancialDashboardPage.tsx` renders:

- **YTD Giving / YTD Expenses / YTD Net** summary cards
- **Monthly giving vs expenses bar chart** (BarChart from Recharts)
- **Giving by fund pie chart** (PieChart from Recharts)

Data is fetched from GET /api/reports/financial-overview?year=XXXX using TanStack Query.
The year selector defaults to the current year and triggers a refetch on change.

Recharts components used: `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`,
`Tooltip`, `Legend`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`.

Custom tooltips show dollar amounts formatted with `Intl.NumberFormat`.

**How the aggregate queries work:**

The backend groups donation and expense rows by date field using Prisma `groupBy` with `_sum`.
Monthly aggregation is done client-side in the backend handler: each row is placed into the
correct 0-indexed month bucket using `new Date(row.date).getMonth()`.

---

## PDF Generation

PDF export is handled client-side via `jsPDF` and `jspdf-autotable`.
The module at `frontend/src/lib/pdf.ts` exports three functions:

| Function | Generates |
|---|---|
| `generateInvoicePDF(invoice, org?)` | Invoice PDF (line items table, totals, notes) |
| `generatePurchaseOrderPDF(po, org?)` | Purchase Order PDF |
| `generateDonorStatementPDF(statement, org?)` | IRS-compliant Charitable Contribution Acknowledgment |

The donor statement satisfies IRC 170(f)(8) contemporaneous written acknowledgment requirements.
It includes the EIN, 501(c)(3) language, a quid pro quo disclosure, and an authorized officer signature block.

Each function calls `doc.save(filename)` which triggers a browser download.

The organization details are passed as an `Organization` object (name, address, EIN, etc.).
A default placeholder org is used when no org is passed; in production this should be populated
from GET /api/settings/organization.

---

## CSV Export

The module at `frontend/src/lib/csv.ts` provides:

| Export | Purpose |
|---|---|
| `downloadCSV(filename, headers, rows)` | Write headers + rows as CSV and trigger download |
| `exportToCSV(data, columns, filename)` | Generic typed exporter using column definitions |
| `generateExportFilename(prefix)` | Returns `prefix-export-YYYY-MM-DD.csv` |
| `formatCentsToDollars(cents)` | Formats integer cents to 2-decimal-place string |
| `formatDate(dateStr)` | Locale date string or empty string for null |

CSV injection protection: cells leading with `=`, `+`, `-`, `@` are prefixed with a single quote.
Values containing commas, quotes, or newlines are wrapped in double quotes with internal quotes doubled.
A UTF-8 BOM is prepended for Excel compatibility.

Several backend report endpoints also emit CSV directly (format=csv query param) via a server-side
`sendCSV(res, filename, headers, rows)` helper. This bypasses the client-side CSV module.

---

## Adding a New Report

**Backend:**

1. Add a GET route in `backend/src/routes/reports.ts`.
2. Apply the appropriate permission guard (`requirePermission(...)`).
3. Use Prisma aggregate queries (`groupBy`, `_sum`, `_count`, `findMany`) to build the result.
4. Add `format=csv` handling using the `sendCSV()` helper if CSV export is needed.

**Frontend:**

1. Add a page component in `frontend/src/pages/reports/`.
2. Register the route in `frontend/src/App.tsx`.
3. Add a navigation entry in the reports hub page.
4. Fetch data with TanStack Query using the new endpoint.

---

## Permission Keys

| Key | Grants |
|---|---|
| `reports.view` | Access membership, attendance, giving, sales, and volunteer summary reports |
| `accounting.view` | Access funds summary and financial overview reports |
| `giving.view` | Access donor-level giving summary and donor statement |

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/routes/reports.ts` | All report endpoints |
| `frontend/src/lib/pdf.ts` | jsPDF invoice, PO, and donor statement generators |
| `frontend/src/lib/csv.ts` | Client-side CSV export utilities |
| `frontend/src/pages/reports/FinancialDashboardPage.tsx` | Financial dashboard with Recharts |
| `frontend/src/pages/reports/ReportsHubPage.tsx` | Report navigation hub |
| `frontend/src/pages/reports/GivingReportPage.tsx` | Fund-level giving report |
| `frontend/src/pages/reports/MembershipReportPage.tsx` | Membership statistics |
| `frontend/src/pages/reports/AttendanceReportPage.tsx` | Attendance check-in report |
| `frontend/src/pages/reports/SalesReportPage.tsx` | Sales summary report |
