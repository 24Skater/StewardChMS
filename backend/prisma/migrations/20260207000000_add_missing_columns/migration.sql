-- Add missing columns to members table for kids check-in feature
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "is_child" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "security_code" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "allergies" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "medical_notes" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "parental_notes" TEXT;

-- Add unique constraint for security_code
CREATE UNIQUE INDEX IF NOT EXISTS "members_security_code_key" ON "members"("security_code");

-- Add missing is_active column to funds table
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Add missing columns to donations table for guest donations and Stripe integration
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "guest_email" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "stripe_charge_id" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "stripe_status" TEXT;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "is_online" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraints for Stripe fields
CREATE UNIQUE INDEX IF NOT EXISTS "donations_stripe_payment_intent_id_key" ON "donations"("stripe_payment_intent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "donations_stripe_charge_id_key" ON "donations"("stripe_charge_id");

-- Add index for stripe_payment_intent_id
CREATE INDEX IF NOT EXISTS "donations_stripe_payment_intent_id_idx" ON "donations"("stripe_payment_intent_id");
