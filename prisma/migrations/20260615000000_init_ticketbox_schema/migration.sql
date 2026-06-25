-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "role_code" AS ENUM ('AUDIENCE', 'ORGANIZER', 'CHECKIN_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "asset_kind" AS ENUM ('POSTER', 'SEATING_MAP', 'PRESS_KIT', 'GUEST_LIST_CSV', 'QR_IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('ACTIVE', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "concert_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ENDED');

-- CreateEnum
CREATE TYPE "seating_zone_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ticket_type_status" AS ENUM ('ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_event_type" AS ENUM ('REDIRECT_CREATED', 'CALLBACK_RECEIVED', 'WEBHOOK_RECEIVED', 'RECONCILED', 'FAILED', 'DUPLICATE_IGNORED');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('ISSUED', 'CHECKED_IN', 'VOIDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "checkin_assignment_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "checkin_event_source" AS ENUM ('ONLINE', 'OFFLINE_SYNC');

-- CreateEnum
CREATE TYPE "checkin_event_result" AS ENUM ('ACCEPTED', 'DUPLICATE', 'INVALID', 'WRONG_CONCERT', 'UNASSIGNED_STAFF', 'CONFLICT');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notification_attempt_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "guest_list_batch_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "guest_list_entry_status" AS ENUM ('VALID', 'INVALID', 'DUPLICATE', 'IMPORTED');

-- CreateEnum
CREATE TYPE "artist_bio_status" AS ENUM ('DRAFT', 'PROCESSING', 'READY_FOR_REVIEW', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "idempotency_record_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" "role_code" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "kind" "asset_kind" NOT NULL,
    "status" "asset_status" NOT NULL DEFAULT 'ACTIVE',
    "storage_key" TEXT NOT NULL,
    "public_url" TEXT,
    "original_name" TEXT,
    "content_type" VARCHAR(160),
    "size_bytes" INTEGER,
    "checksum" TEXT,
    "metadata" JSONB,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerts" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(220) NOT NULL,
    "artist_name" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "venue_name" VARCHAR(220) NOT NULL,
    "venue_address" TEXT,
    "city" VARCHAR(120) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "concert_status" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "poster_asset_id" UUID,
    "seating_map_asset_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "concerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seating_zones" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "svg_element_id" VARCHAR(180) NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "color" VARCHAR(32),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "seating_zone_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seating_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "price_vnd" INTEGER NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "max_per_user" INTEGER NOT NULL,
    "sale_starts_at" TIMESTAMPTZ(6) NOT NULL,
    "sale_ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "ticket_type_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_type_zones" (
    "ticket_type_id" UUID NOT NULL,
    "seating_zone_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_type_zones_pkey" PRIMARY KEY ("ticket_type_id","seating_zone_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(80) NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "total_amount_vnd" INTEGER NOT NULL,
    "reservation_expires_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_vnd" INTEGER NOT NULL,
    "total_price_vnd" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "provider_transaction_id" VARCHAR(160),
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "amount_vnd" INTEGER NOT NULL,
    "redirect_url" TEXT,
    "failure_code" VARCHAR(120),
    "failure_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "event_type" "payment_event_type" NOT NULL,
    "provider_event_id" VARCHAR(160),
    "provider_transaction_id" VARCHAR(160),
    "payload" JSONB,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticket_number" VARCHAR(80) NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "qr_token_hash" TEXT NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_staff_assignments" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "gate_name" VARCHAR(120),
    "status" "checkin_assignment_status" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "checkin_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_events" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "concert_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "source" "checkin_event_source" NOT NULL,
    "result" "checkin_event_result" NOT NULL,
    "scanned_qr_hash" TEXT,
    "device_id" VARCHAR(160),
    "offline_event_id" VARCHAR(160),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejection_reason" TEXT,

    CONSTRAINT "checkin_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID,
    "channel" "notification_channel" NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(240),
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attempts" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "status" "notification_attempt_status" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(80),
    "provider_message_id" VARCHAR(160),
    "error_message" TEXT,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_list_batches" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "asset_id" UUID,
    "uploaded_by_id" UUID,
    "source_name" VARCHAR(180) NOT NULL,
    "status" "guest_list_batch_status" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "invalid_rows" INTEGER NOT NULL DEFAULT 0,
    "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_list_entries" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "ticket_type_id" UUID,
    "external_ref" VARCHAR(160),
    "guest_name" VARCHAR(180) NOT NULL,
    "email" VARCHAR(320),
    "normalized_email" VARCHAR(320),
    "phone" VARCHAR(40),
    "status" "guest_list_entry_status" NOT NULL DEFAULT 'VALID',
    "row_number" INTEGER NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_bios" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "press_kit_asset_id" UUID,
    "requested_by_id" UUID,
    "reviewed_by_id" UUID,
    "status" "artist_bio_status" NOT NULL DEFAULT 'DRAFT',
    "source_text" TEXT,
    "generated_bio" TEXT,
    "published_bio" TEXT,
    "provider" VARCHAR(80),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "artist_bios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation" VARCHAR(120) NOT NULL,
    "idempotency_key" VARCHAR(180) NOT NULL,
    "status" "idempotency_record_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "request_hash" TEXT,
    "response_body" JSONB,
    "resource_type" VARCHAR(80),
    "resource_id" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_storage_key_key" ON "assets"("storage_key");

-- CreateIndex
CREATE INDEX "assets_kind_status_idx" ON "assets"("kind", "status");

-- CreateIndex
CREATE INDEX "assets_uploaded_by_id_idx" ON "assets"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "concerts_slug_key" ON "concerts"("slug");

-- CreateIndex
CREATE INDEX "concerts_status_starts_at_idx" ON "concerts"("status", "starts_at");

-- CreateIndex
CREATE INDEX "concerts_created_by_id_idx" ON "concerts"("created_by_id");

-- CreateIndex
CREATE INDEX "seating_zones_concert_id_status_idx" ON "seating_zones"("concert_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "seating_zones_id_concert_id_key" ON "seating_zones"("id", "concert_id");

-- CreateIndex
CREATE UNIQUE INDEX "seating_zones_concert_id_svg_element_id_key" ON "seating_zones"("concert_id", "svg_element_id");

-- CreateIndex
CREATE INDEX "ticket_types_concert_id_status_idx" ON "ticket_types"("concert_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_id_concert_id_key" ON "ticket_types"("id", "concert_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_concert_id_code_key" ON "ticket_types"("concert_id", "code");

-- CreateIndex
CREATE INDEX "ticket_type_zones_concert_id_idx" ON "ticket_type_zones"("concert_id");

-- CreateIndex
CREATE INDEX "ticket_type_zones_seating_zone_id_idx" ON "ticket_type_zones"("seating_zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "orders_concert_id_status_idx" ON "orders"("concert_id", "status");

-- CreateIndex
CREATE INDEX "orders_status_reservation_expires_at_idx" ON "orders"("status", "reservation_expires_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_ticket_type_id_idx" ON "order_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payments_order_id_status_idx" ON "payments"("order_id", "status");

-- CreateIndex
CREATE INDEX "payments_user_id_status_idx" ON "payments"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_received_at_idx" ON "payment_events"("payment_id", "received_at");

-- CreateIndex
CREATE INDEX "payment_events_provider_transaction_id_idx" ON "payment_events"("provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_token_hash_key" ON "tickets"("qr_token_hash");

-- CreateIndex
CREATE INDEX "tickets_user_id_status_idx" ON "tickets"("user_id", "status");

-- CreateIndex
CREATE INDEX "tickets_concert_id_status_idx" ON "tickets"("concert_id", "status");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_id_idx" ON "tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "checkin_staff_assignments_concert_id_status_idx" ON "checkin_staff_assignments"("concert_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_staff_assignments_staff_id_concert_id_gate_name_key" ON "checkin_staff_assignments"("staff_id", "concert_id", "gate_name");

-- CreateIndex
CREATE INDEX "checkin_events_ticket_id_result_idx" ON "checkin_events"("ticket_id", "result");

-- CreateIndex
CREATE INDEX "checkin_events_concert_id_occurred_at_idx" ON "checkin_events"("concert_id", "occurred_at");

-- CreateIndex
CREATE INDEX "checkin_events_staff_id_occurred_at_idx" ON "checkin_events"("staff_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_events_device_id_offline_event_id_key" ON "checkin_events"("device_id", "offline_event_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_concert_id_idx" ON "notifications"("concert_id");

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notification_attempts_notification_id_attempted_at_idx" ON "notification_attempts"("notification_id", "attempted_at");

-- CreateIndex
CREATE INDEX "guest_list_batches_concert_id_status_idx" ON "guest_list_batches"("concert_id", "status");

-- CreateIndex
CREATE INDEX "guest_list_entries_batch_id_status_idx" ON "guest_list_entries"("batch_id", "status");

-- CreateIndex
CREATE INDEX "guest_list_entries_ticket_type_id_idx" ON "guest_list_entries"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_entries_batch_id_external_ref_key" ON "guest_list_entries"("batch_id", "external_ref");

-- CreateIndex
CREATE UNIQUE INDEX "guest_list_entries_batch_id_normalized_email_key" ON "guest_list_entries"("batch_id", "normalized_email");

-- CreateIndex
CREATE INDEX "artist_bios_concert_id_status_idx" ON "artist_bios"("concert_id", "status");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_operation_idempotency_key_key" ON "idempotency_records"("user_id", "operation", "idempotency_key");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_poster_asset_id_fkey" FOREIGN KEY ("poster_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_seating_map_asset_id_fkey" FOREIGN KEY ("seating_map_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seating_zones" ADD CONSTRAINT "seating_zones_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_type_zones" ADD CONSTRAINT "ticket_type_zones_ticket_type_id_concert_id_fkey" FOREIGN KEY ("ticket_type_id", "concert_id") REFERENCES "ticket_types"("id", "concert_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_type_zones" ADD CONSTRAINT "ticket_type_zones_seating_zone_id_concert_id_fkey" FOREIGN KEY ("seating_zone_id", "concert_id") REFERENCES "seating_zones"("id", "concert_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_staff_assignments" ADD CONSTRAINT "checkin_staff_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_staff_assignments" ADD CONSTRAINT "checkin_staff_assignments_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_events" ADD CONSTRAINT "checkin_events_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_batches" ADD CONSTRAINT "guest_list_batches_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_batches" ADD CONSTRAINT "guest_list_batches_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_batches" ADD CONSTRAINT "guest_list_batches_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "guest_list_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_bios" ADD CONSTRAINT "artist_bios_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_bios" ADD CONSTRAINT "artist_bios_press_kit_asset_id_fkey" FOREIGN KEY ("press_kit_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_bios" ADD CONSTRAINT "artist_bios_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_bios" ADD CONSTRAINT "artist_bios_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Raw PostgreSQL constraints not represented in the Prisma schema.
ALTER TABLE "assets" ADD CONSTRAINT "assets_size_bytes_non_negative_chk" CHECK ("size_bytes" IS NULL OR "size_bytes" >= 0);

ALTER TABLE "concerts" ADD CONSTRAINT "concerts_time_window_chk" CHECK ("starts_at" < "ends_at");

ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_price_non_negative_chk" CHECK ("price_vnd" >= 0);
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_total_quantity_non_negative_chk" CHECK ("total_quantity" >= 0);
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_reserved_quantity_non_negative_chk" CHECK ("reserved_quantity" >= 0);
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_sold_quantity_non_negative_chk" CHECK ("sold_quantity" >= 0);
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_inventory_bounds_chk" CHECK ("reserved_quantity" + "sold_quantity" <= "total_quantity");
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_max_per_user_positive_chk" CHECK ("max_per_user" > 0);
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_sale_window_chk" CHECK ("sale_starts_at" < "sale_ends_at");

ALTER TABLE "orders" ADD CONSTRAINT "orders_total_amount_non_negative_chk" CHECK ("total_amount_vnd" >= 0);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive_chk" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_non_negative_chk" CHECK ("unit_price_vnd" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_total_price_non_negative_chk" CHECK ("total_price_vnd" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_total_matches_quantity_chk" CHECK ("total_price_vnd" = "quantity" * "unit_price_vnd");

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_non_negative_chk" CHECK ("amount_vnd" >= 0);

ALTER TABLE "guest_list_batches" ADD CONSTRAINT "guest_list_batches_counts_non_negative_chk" CHECK (
    "total_rows" >= 0
    AND "valid_rows" >= 0
    AND "invalid_rows" >= 0
    AND "duplicate_rows" >= 0
);

ALTER TABLE "guest_list_entries" ADD CONSTRAINT "guest_list_entries_row_number_positive_chk" CHECK ("row_number" > 0);

CREATE UNIQUE INDEX "checkin_events_one_accepted_per_ticket_idx"
ON "checkin_events"("ticket_id")
WHERE "ticket_id" IS NOT NULL AND "result" = 'ACCEPTED';
