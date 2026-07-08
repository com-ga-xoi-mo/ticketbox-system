-- CreateEnum
CREATE TYPE "waitlist_entry_status" AS ENUM ('WAITING', 'GRANTED', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "purchase_entitlement_status" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "purchase_entitlement_source" AS ENUM ('WAITLIST', 'LOTTERY');

-- AlterEnum
ALTER TYPE "notification_resource_type" ADD VALUE 'WAITLIST_ENTITLEMENT';

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "desired_quantity" INTEGER NOT NULL,
    "status" "waitlist_entry_status" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_at" TIMESTAMPTZ(6),
    "fulfilled_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_entitlements" (
    "id" UUID NOT NULL,
    "waitlist_entry_id" UUID,
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "order_id" UUID,
    "source" "purchase_entitlement_source" NOT NULL DEFAULT 'WAITLIST',
    "status" "purchase_entitlement_status" NOT NULL DEFAULT 'ACTIVE',
    "quantity" INTEGER NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_ticket_type_id_status_joined_at_idx" ON "waitlist_entries"("ticket_type_id", "status", "joined_at");

-- CreateIndex
CREATE INDEX "waitlist_entries_user_id_concert_id_ticket_type_id_status_idx" ON "waitlist_entries"("user_id", "concert_id", "ticket_type_id", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_concert_id_status_idx" ON "waitlist_entries"("concert_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_one_active_per_user_ticket_type_idx" ON "waitlist_entries"("user_id", "ticket_type_id") WHERE "status" IN ('WAITING', 'GRANTED');

-- CreateIndex
CREATE INDEX "purchase_entitlements_ticket_type_id_status_expires_at_idx" ON "purchase_entitlements"("ticket_type_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "purchase_entitlements_user_id_concert_id_ticket_type_id_status_idx" ON "purchase_entitlements"("user_id", "concert_id", "ticket_type_id", "status");

-- CreateIndex
CREATE INDEX "purchase_entitlements_waitlist_entry_id_idx" ON "purchase_entitlements"("waitlist_entry_id");

-- CreateIndex
CREATE INDEX "purchase_entitlements_order_id_idx" ON "purchase_entitlements"("order_id");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_waitlist_entry_id_fkey" FOREIGN KEY ("waitlist_entry_id") REFERENCES "waitlist_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
