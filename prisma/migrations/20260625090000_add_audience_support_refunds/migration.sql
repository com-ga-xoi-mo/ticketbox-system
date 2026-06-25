-- CreateEnum
CREATE TYPE "notification_resource_type" AS ENUM ('ORDER', 'TICKET', 'SUPPORT_REQUEST', 'REFUND_REQUEST', 'CONCERT');

-- CreateEnum
CREATE TYPE "support_request_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "support_request_category" AS ENUM ('ORDER_HELP', 'TICKET_HELP', 'PAYMENT_HELP', 'REFUND_HELP', 'ACCOUNT_HELP', 'OTHER');

-- CreateEnum
CREATE TYPE "refund_request_status" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "refund_request_reason" AS ENUM ('CANNOT_ATTEND', 'EVENT_CHANGED', 'DUPLICATE_PURCHASE', 'PAYMENT_ISSUE', 'OTHER');

-- AlterTable
ALTER TABLE "notifications"
ADD COLUMN "action_url" VARCHAR(500),
ADD COLUMN "resource_type" "notification_resource_type",
ADD COLUMN "resource_id" UUID,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "read_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "support_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "order_id" UUID,
  "ticket_id" UUID,
  "category" "support_request_category" NOT NULL,
  "status" "support_request_status" NOT NULL DEFAULT 'OPEN',
  "subject" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_request_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "support_request_id" UUID NOT NULL,
  "status" "support_request_status" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "ticket_id" UUID,
  "status" "refund_request_status" NOT NULL DEFAULT 'REQUESTED',
  "reason" "refund_request_reason" NOT NULL,
  "message" TEXT,
  "requested_amount_vnd" INTEGER,
  "requested_ticket_count" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_request_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "refund_request_id" UUID NOT NULL,
  "status" "refund_request_status" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "refund_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_resource_type_resource_id_idx" ON "notifications"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "support_requests_user_id_updated_at_idx" ON "support_requests"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "support_requests_order_id_idx" ON "support_requests"("order_id");

-- CreateIndex
CREATE INDEX "support_requests_ticket_id_idx" ON "support_requests"("ticket_id");

-- CreateIndex
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");

-- CreateIndex
CREATE INDEX "support_request_status_history_support_request_id_created_at_idx" ON "support_request_status_history"("support_request_id", "created_at");

-- CreateIndex
CREATE INDEX "refund_requests_user_id_updated_at_idx" ON "refund_requests"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "refund_requests_order_id_status_idx" ON "refund_requests"("order_id", "status");

-- CreateIndex
CREATE INDEX "refund_requests_ticket_id_status_idx" ON "refund_requests"("ticket_id", "status");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_request_status_history_refund_request_id_created_at_idx" ON "refund_request_status_history"("refund_request_id", "created_at");

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_request_status_history" ADD CONSTRAINT "support_request_status_history_support_request_id_fkey" FOREIGN KEY ("support_request_id") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_request_status_history" ADD CONSTRAINT "refund_request_status_history_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
