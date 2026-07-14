/*
  Warnings:

  - You are about to drop the column `entitlement_ttl_minutes` on the `lottery_configs` table. All the data in the column will be lost.
  - You are about to drop the `purchase_entitlements` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "waitlist_availability_marker" AS ENUM ('AVAILABLE', 'SOLD_OUT', 'NOTIFIED');

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_concert_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_lottery_registration_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_order_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_ticket_type_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_entitlements" DROP CONSTRAINT "purchase_entitlements_waitlist_entry_id_fkey";

-- AlterTable
ALTER TABLE "concert_reviews" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lottery_configs" DROP COLUMN "entitlement_ttl_minutes";

-- AlterTable
ALTER TABLE "lottery_registrations" ADD COLUMN     "purchased_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "won_quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "waiting_room_configs" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "purchase_entitlements";

-- DropEnum
DROP TYPE "purchase_entitlement_source";

-- DropEnum
DROP TYPE "purchase_entitlement_status";

-- CreateTable
CREATE TABLE "waitlist_ticket_availability" (
    "id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "marker_state" "waitlist_availability_marker" NOT NULL DEFAULT 'AVAILABLE',
    "last_notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waitlist_ticket_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_ticket_availability_ticket_type_id_key" ON "waitlist_ticket_availability"("ticket_type_id");

-- AddForeignKey
ALTER TABLE "waitlist_ticket_availability" ADD CONSTRAINT "waitlist_ticket_availability_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
