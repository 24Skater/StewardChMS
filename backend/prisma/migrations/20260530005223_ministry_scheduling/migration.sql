-- CreateEnum
CREATE TYPE "SchedulePeriodStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ministry_calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ministry_id" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "reminder_days_before_slot" INTEGER NOT NULL DEFAULT 2,
    "service_day_of_week" INTEGER NOT NULL DEFAULT 0,
    "rotation_next_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ministry_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_rotation_members" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "rotation_order" INTEGER NOT NULL,

    CONSTRAINT "calendar_rotation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_periods" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "SchedulePeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "slot_date" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "event_occurrence_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_assignments" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ministry_calendars_share_token_key" ON "ministry_calendars"("share_token");

-- CreateIndex
CREATE INDEX "ministry_calendars_ministry_id_idx" ON "ministry_calendars"("ministry_id");

-- CreateIndex
CREATE INDEX "ministry_calendars_share_token_idx" ON "ministry_calendars"("share_token");

-- CreateIndex
CREATE INDEX "calendar_rotation_members_calendar_id_idx" ON "calendar_rotation_members"("calendar_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_rotation_members_calendar_id_member_id_key" ON "calendar_rotation_members"("calendar_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_rotation_members_calendar_id_rotation_order_key" ON "calendar_rotation_members"("calendar_id", "rotation_order");

-- CreateIndex
CREATE INDEX "schedule_periods_calendar_id_idx" ON "schedule_periods"("calendar_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_periods_calendar_id_year_month_key" ON "schedule_periods"("calendar_id", "year", "month");

-- CreateIndex
CREATE INDEX "schedule_slots_period_id_idx" ON "schedule_slots"("period_id");

-- CreateIndex
CREATE INDEX "schedule_slots_slot_date_idx" ON "schedule_slots"("slot_date");

-- CreateIndex
CREATE UNIQUE INDEX "slot_assignments_slot_id_key" ON "slot_assignments"("slot_id");

-- CreateIndex
CREATE INDEX "slot_assignments_member_id_idx" ON "slot_assignments"("member_id");

-- CreateIndex
CREATE INDEX "slot_assignments_slot_id_idx" ON "slot_assignments"("slot_id");

-- AddForeignKey
ALTER TABLE "ministry_calendars" ADD CONSTRAINT "ministry_calendars_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_calendars" ADD CONSTRAINT "ministry_calendars_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_rotation_members" ADD CONSTRAINT "calendar_rotation_members_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "ministry_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_rotation_members" ADD CONSTRAINT "calendar_rotation_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "ministry_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "schedule_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_event_occurrence_id_fkey" FOREIGN KEY ("event_occurrence_id") REFERENCES "event_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_assignments" ADD CONSTRAINT "slot_assignments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "schedule_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_assignments" ADD CONSTRAINT "slot_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_assignments" ADD CONSTRAINT "slot_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
