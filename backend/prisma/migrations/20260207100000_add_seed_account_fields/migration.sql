-- Add isPrimaryAdmin and isSeedAccount fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_primary_admin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_seed_account" BOOLEAN NOT NULL DEFAULT false;
