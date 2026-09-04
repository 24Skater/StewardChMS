-- Tenancy: one database, many churches.
--
-- Every table that holds a church's data gains `org_id`, and `orgs` is the root
-- those columns point at. `orgs.id` is the console's organization id — minted
-- there, never generated here — which is why the column has no default.
--
-- The order matters. Adding a NOT NULL column to a table that already has rows
-- fails, and every existing installation has rows, so each column arrives
-- nullable, gets backfilled to the placeholder organization below, and is only
-- then tightened. A fresh database walks the same path over zero rows.

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('active', 'suspended');

-- CreateTable
CREATE TABLE "orgs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- The two tables the inserts below rely on need their unique indexes
-- first: an ON CONFLICT clause can only name a constraint that exists.
CREATE UNIQUE INDEX "orgs_slug_key" ON "orgs"("slug");
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");
CREATE UNIQUE INDEX "memberships_org_id_user_id_key" ON "memberships"("org_id", "user_id");

-- The organization every existing row belongs to.
--
-- A single-church installation that predates the platform has data but no
-- organization, and the data has to end up somewhere. This is that somewhere:
-- a fixed id so re-running is idempotent, and a name lifted from the church's
-- own branding setting when it has one, because "Default Organization" is a
-- poor thing to show a congregation.
--
-- A database that is provisioned by the console instead gets its real
-- organization through POST /api/internal/provision and never uses this row.
INSERT INTO "orgs" ("id", "slug", "name", "status", "created_at", "updated_at")
SELECT
  '00000000-0000-0000-0000-000000000001',
  'default',
  COALESCE(
    -- `value` is jsonb; #>> '{}' unwraps the scalar to text rather than
    -- leaving the quotes in the organization's name.
    (SELECT "value" #>> '{}' FROM "settings" WHERE "category" = 'branding' AND "key" = 'church_name' LIMIT 1),
    'Default Organization'
  ),
  'active',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "users")
ON CONFLICT ("id") DO NOTHING;

-- AddColumn (nullable), backfill, then tighten.
ALTER TABLE "audit_logs" ADD COLUMN "org_id" TEXT;
ALTER TABLE "members" ADD COLUMN "org_id" TEXT;
ALTER TABLE "households" ADD COLUMN "org_id" TEXT;
ALTER TABLE "household_members" ADD COLUMN "org_id" TEXT;
ALTER TABLE "events" ADD COLUMN "org_id" TEXT;
ALTER TABLE "event_occurrences" ADD COLUMN "org_id" TEXT;
ALTER TABLE "registrations" ADD COLUMN "org_id" TEXT;
ALTER TABLE "check_ins" ADD COLUMN "org_id" TEXT;
ALTER TABLE "songs" ADD COLUMN "org_id" TEXT;
ALTER TABLE "worship_plans" ADD COLUMN "org_id" TEXT;
ALTER TABLE "worship_plan_items" ADD COLUMN "org_id" TEXT;
ALTER TABLE "messages" ADD COLUMN "org_id" TEXT;
ALTER TABLE "message_recipients" ADD COLUMN "org_id" TEXT;
ALTER TABLE "message_templates" ADD COLUMN "org_id" TEXT;
ALTER TABLE "opt_in_preferences" ADD COLUMN "org_id" TEXT;
ALTER TABLE "funds" ADD COLUMN "org_id" TEXT;
ALTER TABLE "donations" ADD COLUMN "org_id" TEXT;
ALTER TABLE "pledges" ADD COLUMN "org_id" TEXT;
ALTER TABLE "vendors" ADD COLUMN "org_id" TEXT;
ALTER TABLE "expenses" ADD COLUMN "org_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "org_id" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "org_id" TEXT;
ALTER TABLE "products" ADD COLUMN "org_id" TEXT;
ALTER TABLE "inventory_transactions" ADD COLUMN "org_id" TEXT;
ALTER TABLE "sales" ADD COLUMN "org_id" TEXT;
ALTER TABLE "settings" ADD COLUMN "org_id" TEXT;
ALTER TABLE "ministries" ADD COLUMN "org_id" TEXT;
ALTER TABLE "groups" ADD COLUMN "org_id" TEXT;
ALTER TABLE "group_members" ADD COLUMN "org_id" TEXT;
ALTER TABLE "group_leaders" ADD COLUMN "org_id" TEXT;
ALTER TABLE "ministry_calendars" ADD COLUMN "org_id" TEXT;
ALTER TABLE "calendar_rotation_members" ADD COLUMN "org_id" TEXT;
ALTER TABLE "schedule_periods" ADD COLUMN "org_id" TEXT;
ALTER TABLE "schedule_slots" ADD COLUMN "org_id" TEXT;
ALTER TABLE "slot_assignments" ADD COLUMN "org_id" TEXT;

ALTER TABLE "user_roles" ADD COLUMN "org_id" TEXT;

UPDATE "audit_logs" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "members" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "households" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "household_members" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "events" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "event_occurrences" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "registrations" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "check_ins" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "songs" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "worship_plans" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "worship_plan_items" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "messages" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "message_recipients" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "message_templates" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "opt_in_preferences" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "funds" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "donations" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "pledges" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "vendors" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "expenses" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "invoices" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "purchase_orders" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "products" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "inventory_transactions" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "sales" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "settings" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "ministries" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "groups" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "group_members" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "group_leaders" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "ministry_calendars" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "calendar_rotation_members" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "schedule_periods" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "schedule_slots" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "slot_assignments" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;
UPDATE "user_roles" SET "org_id" = '00000000-0000-0000-0000-000000000001' WHERE "org_id" IS NULL;

-- Rows can only be orphaned if the backfill above found no organization to
-- assign them to, which happens exactly when the installation was empty. The
-- delete is therefore a no-op with a safety property rather than data loss.
DELETE FROM "audit_logs" WHERE "org_id" IS NULL;
DELETE FROM "members" WHERE "org_id" IS NULL;
DELETE FROM "households" WHERE "org_id" IS NULL;
DELETE FROM "household_members" WHERE "org_id" IS NULL;
DELETE FROM "events" WHERE "org_id" IS NULL;
DELETE FROM "event_occurrences" WHERE "org_id" IS NULL;
DELETE FROM "registrations" WHERE "org_id" IS NULL;
DELETE FROM "check_ins" WHERE "org_id" IS NULL;
DELETE FROM "songs" WHERE "org_id" IS NULL;
DELETE FROM "worship_plans" WHERE "org_id" IS NULL;
DELETE FROM "worship_plan_items" WHERE "org_id" IS NULL;
DELETE FROM "messages" WHERE "org_id" IS NULL;
DELETE FROM "message_recipients" WHERE "org_id" IS NULL;
DELETE FROM "message_templates" WHERE "org_id" IS NULL;
DELETE FROM "opt_in_preferences" WHERE "org_id" IS NULL;
DELETE FROM "funds" WHERE "org_id" IS NULL;
DELETE FROM "donations" WHERE "org_id" IS NULL;
DELETE FROM "pledges" WHERE "org_id" IS NULL;
DELETE FROM "vendors" WHERE "org_id" IS NULL;
DELETE FROM "expenses" WHERE "org_id" IS NULL;
DELETE FROM "invoices" WHERE "org_id" IS NULL;
DELETE FROM "purchase_orders" WHERE "org_id" IS NULL;
DELETE FROM "products" WHERE "org_id" IS NULL;
DELETE FROM "inventory_transactions" WHERE "org_id" IS NULL;
DELETE FROM "sales" WHERE "org_id" IS NULL;
DELETE FROM "settings" WHERE "org_id" IS NULL;
DELETE FROM "ministries" WHERE "org_id" IS NULL;
DELETE FROM "groups" WHERE "org_id" IS NULL;
DELETE FROM "group_members" WHERE "org_id" IS NULL;
DELETE FROM "group_leaders" WHERE "org_id" IS NULL;
DELETE FROM "ministry_calendars" WHERE "org_id" IS NULL;
DELETE FROM "calendar_rotation_members" WHERE "org_id" IS NULL;
DELETE FROM "schedule_periods" WHERE "org_id" IS NULL;
DELETE FROM "schedule_slots" WHERE "org_id" IS NULL;
DELETE FROM "slot_assignments" WHERE "org_id" IS NULL;
DELETE FROM "user_roles" WHERE "org_id" IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "members" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "households" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "household_members" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "event_occurrences" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "registrations" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "check_ins" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "songs" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "worship_plans" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "worship_plan_items" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "message_recipients" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "message_templates" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "opt_in_preferences" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "funds" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "donations" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "pledges" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "expenses" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "purchase_orders" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "inventory_transactions" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "settings" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "ministries" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "groups" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "group_members" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "group_leaders" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "ministry_calendars" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "calendar_rotation_members" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "schedule_periods" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "schedule_slots" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "slot_assignments" ALTER COLUMN "org_id" SET NOT NULL;

-- A role grant is per organization now, so the primary key has to say so.
ALTER TABLE "user_roles" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("org_id", "user_id", "role_id");

-- Everyone who could already sign in belongs to the organization their data
-- was just assigned to. The first primary admin owns it.
INSERT INTO "memberships" ("id", "org_id", "user_id", "is_owner", "created_at")
SELECT
  gen_random_uuid()::text,
  '00000000-0000-0000-0000-000000000001',
  u."id",
  u."is_primary_admin",
  NOW()
FROM "users" u
WHERE EXISTS (SELECT 1 FROM "orgs" WHERE "id" = '00000000-0000-0000-0000-000000000001')
ON CONFLICT ("org_id", "user_id") DO NOTHING;

-- Uniqueness was global and is now per organization: two churches may both
-- have a fund called General, a member with the same email, or invoice #1.
DROP INDEX "members_email_key";
DROP INDEX "members_security_code_key";
DROP INDEX "funds_name_key";
DROP INDEX "vendors_name_key";
DROP INDEX "invoices_invoice_number_key";
DROP INDEX "purchase_orders_po_number_key";
DROP INDEX "products_name_key";
DROP INDEX "products_sku_key";
DROP INDEX "sales_sale_number_key";
DROP INDEX "settings_category_key_key";
DROP INDEX "ministries_name_key";

CREATE INDEX "user_roles_org_id_idx" ON "user_roles"("org_id");
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs"("org_id");
CREATE INDEX "members_org_id_idx" ON "members"("org_id");
CREATE UNIQUE INDEX "members_org_id_email_key" ON "members"("org_id", "email");
CREATE UNIQUE INDEX "members_org_id_security_code_key" ON "members"("org_id", "security_code");
CREATE INDEX "households_org_id_idx" ON "households"("org_id");
CREATE INDEX "household_members_org_id_idx" ON "household_members"("org_id");
CREATE INDEX "events_org_id_idx" ON "events"("org_id");
CREATE INDEX "event_occurrences_org_id_idx" ON "event_occurrences"("org_id");
CREATE INDEX "registrations_org_id_idx" ON "registrations"("org_id");
CREATE INDEX "check_ins_org_id_idx" ON "check_ins"("org_id");
CREATE INDEX "songs_org_id_idx" ON "songs"("org_id");
CREATE INDEX "worship_plans_org_id_idx" ON "worship_plans"("org_id");
CREATE INDEX "worship_plan_items_org_id_idx" ON "worship_plan_items"("org_id");
CREATE INDEX "messages_org_id_idx" ON "messages"("org_id");
CREATE INDEX "message_recipients_org_id_idx" ON "message_recipients"("org_id");
CREATE INDEX "message_templates_org_id_idx" ON "message_templates"("org_id");
CREATE INDEX "opt_in_preferences_org_id_idx" ON "opt_in_preferences"("org_id");
CREATE INDEX "funds_org_id_idx" ON "funds"("org_id");
CREATE UNIQUE INDEX "funds_org_id_name_key" ON "funds"("org_id", "name");
CREATE INDEX "donations_org_id_idx" ON "donations"("org_id");
CREATE INDEX "pledges_org_id_idx" ON "pledges"("org_id");
CREATE INDEX "vendors_org_id_idx" ON "vendors"("org_id");
CREATE UNIQUE INDEX "vendors_org_id_name_key" ON "vendors"("org_id", "name");
CREATE INDEX "expenses_org_id_idx" ON "expenses"("org_id");
CREATE INDEX "invoices_org_id_idx" ON "invoices"("org_id");
CREATE UNIQUE INDEX "invoices_org_id_invoice_number_key" ON "invoices"("org_id", "invoice_number");
CREATE INDEX "purchase_orders_org_id_idx" ON "purchase_orders"("org_id");
CREATE UNIQUE INDEX "purchase_orders_org_id_po_number_key" ON "purchase_orders"("org_id", "po_number");
CREATE INDEX "products_org_id_idx" ON "products"("org_id");
CREATE UNIQUE INDEX "products_org_id_name_key" ON "products"("org_id", "name");
CREATE UNIQUE INDEX "products_org_id_sku_key" ON "products"("org_id", "sku");
CREATE INDEX "inventory_transactions_org_id_idx" ON "inventory_transactions"("org_id");
CREATE INDEX "sales_org_id_idx" ON "sales"("org_id");
CREATE UNIQUE INDEX "sales_org_id_sale_number_key" ON "sales"("org_id", "sale_number");
CREATE INDEX "settings_org_id_idx" ON "settings"("org_id");
CREATE UNIQUE INDEX "settings_org_id_category_key_key" ON "settings"("org_id", "category", "key");
CREATE INDEX "ministries_org_id_idx" ON "ministries"("org_id");
CREATE UNIQUE INDEX "ministries_org_id_name_key" ON "ministries"("org_id", "name");
CREATE INDEX "groups_org_id_idx" ON "groups"("org_id");
CREATE INDEX "group_members_org_id_idx" ON "group_members"("org_id");
CREATE INDEX "group_leaders_org_id_idx" ON "group_leaders"("org_id");
CREATE INDEX "ministry_calendars_org_id_idx" ON "ministry_calendars"("org_id");
CREATE INDEX "calendar_rotation_members_org_id_idx" ON "calendar_rotation_members"("org_id");
CREATE INDEX "schedule_periods_org_id_idx" ON "schedule_periods"("org_id");
CREATE INDEX "schedule_slots_org_id_idx" ON "schedule_slots"("org_id");
CREATE INDEX "slot_assignments_org_id_idx" ON "slot_assignments"("org_id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "households" ADD CONSTRAINT "households_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_occurrences" ADD CONSTRAINT "event_occurrences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "songs" ADD CONSTRAINT "songs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worship_plans" ADD CONSTRAINT "worship_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worship_plan_items" ADD CONSTRAINT "worship_plan_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opt_in_preferences" ADD CONSTRAINT "opt_in_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "funds" ADD CONSTRAINT "funds_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "donations" ADD CONSTRAINT "donations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ministries" ADD CONSTRAINT "ministries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_leaders" ADD CONSTRAINT "group_leaders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ministry_calendars" ADD CONSTRAINT "ministry_calendars_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_rotation_members" ADD CONSTRAINT "calendar_rotation_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "slot_assignments" ADD CONSTRAINT "slot_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
