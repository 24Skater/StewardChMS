-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('scheduled', 'canceled');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('registered', 'canceled');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "category" TEXT,
    "ministry_id" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "start_datetime" TIMESTAMP(3),
    "end_datetime" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_occurrences" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,

    CONSTRAINT "event_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "event_occurrence_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_name" TEXT,
    "guest_email" TEXT,
    "guest_phone" TEXT,
    "party_size" INTEGER NOT NULL DEFAULT 1,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "event_occurrence_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_name" TEXT,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "default_key" TEXT,
    "bpm" INTEGER,
    "lyrics" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worship_plans" (
    "id" TEXT NOT NULL,
    "event_occurrence_id" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worship_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worship_plan_items" (
    "id" TEXT NOT NULL,
    "worship_plan_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "item_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "song_id" TEXT,
    "assigned_member_id" TEXT,
    "duration_minutes" INTEGER,

    CONSTRAINT "worship_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "events_start_datetime_idx" ON "events"("start_datetime");

-- CreateIndex
CREATE INDEX "event_occurrences_starts_at_idx" ON "event_occurrences"("starts_at");

-- CreateIndex
CREATE INDEX "event_occurrences_event_id_idx" ON "event_occurrences"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_occurrences_event_id_starts_at_key" ON "event_occurrences"("event_id", "starts_at");

-- CreateIndex
CREATE INDEX "registrations_event_occurrence_id_idx" ON "registrations"("event_occurrence_id");

-- CreateIndex
CREATE INDEX "registrations_member_id_idx" ON "registrations"("member_id");

-- CreateIndex
CREATE INDEX "check_ins_event_occurrence_id_idx" ON "check_ins"("event_occurrence_id");

-- CreateIndex
CREATE INDEX "check_ins_member_id_idx" ON "check_ins"("member_id");

-- CreateIndex
CREATE INDEX "songs_title_idx" ON "songs"("title");

-- CreateIndex
CREATE UNIQUE INDEX "worship_plans_event_occurrence_id_key" ON "worship_plans"("event_occurrence_id");

-- CreateIndex
CREATE INDEX "worship_plan_items_worship_plan_id_idx" ON "worship_plan_items"("worship_plan_id");

-- CreateIndex
CREATE INDEX "worship_plan_items_song_id_idx" ON "worship_plan_items"("song_id");

-- AddForeignKey
ALTER TABLE "event_occurrences" ADD CONSTRAINT "event_occurrences_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_occurrence_id_fkey" FOREIGN KEY ("event_occurrence_id") REFERENCES "event_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_event_occurrence_id_fkey" FOREIGN KEY ("event_occurrence_id") REFERENCES "event_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worship_plans" ADD CONSTRAINT "worship_plans_event_occurrence_id_fkey" FOREIGN KEY ("event_occurrence_id") REFERENCES "event_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worship_plan_items" ADD CONSTRAINT "worship_plan_items_worship_plan_id_fkey" FOREIGN KEY ("worship_plan_id") REFERENCES "worship_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worship_plan_items" ADD CONSTRAINT "worship_plan_items_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worship_plan_items" ADD CONSTRAINT "worship_plan_items_assigned_member_id_fkey" FOREIGN KEY ("assigned_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
