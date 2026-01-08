# StewardChMS – Specification (Single Source of Truth)

## Stack Alignment (must match StewardPOS)
Frontend must use:
- Vite + React + TypeScript
- React Router DOM
- TailwindCSS + shadcn/ui (Radix UI)
- TanStack React Query
- React Hook Form + Zod

Backend (StewardChMS-only, standalone):
- Node.js API (Express)
- PostgreSQL
- Prisma ORM
- Auth: JWT + bcrypt password hashing
- Shared Zod validation schemas

If a feature is not in this spec, do NOT invent it.

---

## Modules (v1)
1. Auth + RBAC
2. Member CRM + Family Linking
3. Staff + Volunteer Management
4. Events Management
5. Worship Planning
6. Communication Center
7. Accounting + Giving + Pledges + POs/Invoices
8. Ministries & Groups
9. Reporting
10. Sales + Fundraising + Reporting

---

## 1) Auth + RBAC
### Entities
- User
- Role
- Permission
- RolePermission
- UserRole
- AuditLog

### Requirements
- Login/logout
- Password hashing (bcrypt)
- JWT session
- Role checks for API + UI routes
- Seed initial admin

---

## 2) Member CRM
### Entities
- Member
- Tag (optional)
- MemberTag (optional)

### Requirements
- CRUD for members
- Search + filters
- Notes (permission restricted)
- Profile photo URL (optional)

---

## 3) Family / Household Linking
### Entities
- Household
- HouseholdMember (relationship_type: parent|child|spouse|other)

### Requirements
- Household CRUD
- Link members into households
- Household view page

---

## 4) Staff + Volunteers
### Entities
- VolunteerProfile (or MemberRoleAssignment)
- Assignment
- Availability (optional in v1)

### Requirements
- Track staff/volunteers
- Assign to events/services
- Conflict detection (basic)
- Reminders (stub in v1)

---

## 5) Events
### Entities
- Event
- EventOccurrence (for recurring)
- Registration
- CheckIn

### Requirements
- Create events
- Recurring rules (weekly/monthly minimum)
- Registration (free + paid placeholder)
- Attendance check-in

---

## 6) Worship Planning
### Entities
- WorshipPlan
- WorshipPlanItem
- Song

### Requirements
- Worship plan tied to an EventOccurrence
- Song library
- Assign people/roles to plan items

---

## 7) Communication Center
### Entities
- Message
- MessageRecipient
- Template
- OptInPreference

### Requirements
- Email send (stub provider ok)
- SMS send (stub provider ok)
- Group targeting by tags / ministries / roles
- Message history per member

---

## 8) Accounting + Giving
### Entities
- Donation
- Fund
- Pledge
- Expense
- Vendor
- Invoice
- PurchaseOrder

### Requirements
- Track giving + pledges
- Fund accounting
- Expenses
- Generate donor statements (PDF ok)
- Generate invoices + POs (PDF ok)

---

## 9) Ministries & Groups
### Entities
- Ministry
- Group
- GroupMember
- GroupLeader

### Requirements
- Church → Ministries → Groups hierarchy
- Groups can schedule their own events + send messages (permission scoped)

---

## 10) Reporting
### Requirements
- Standard reports:
  - Membership
  - Attendance
  - Giving
  - Volunteer assignments
- Export CSV
- Export PDF (where applicable)

---

## 11) Sales + Fundraising
### Entities
- Product
- InventoryTransaction
- Sale
- SaleItem

### Requirements
- Basic POS sales entry
- Inventory tracking
- Reports
- Integrate sales into accounting summaries
