-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_recipients" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_contact" JSONB,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "delivered_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "message_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opt_in_preferences" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "is_opted_in" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opt_in_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "message_recipients_message_id_idx" ON "message_recipients"("message_id");

-- CreateIndex
CREATE INDEX "message_recipients_delivery_status_idx" ON "message_recipients"("delivery_status");

-- CreateIndex
CREATE UNIQUE INDEX "opt_in_preferences_member_id_channel_key" ON "opt_in_preferences"("member_id", "channel");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opt_in_preferences" ADD CONSTRAINT "opt_in_preferences_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
