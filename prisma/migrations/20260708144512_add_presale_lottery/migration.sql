-- CreateEnum
CREATE TYPE "lottery_config_status" AS ENUM ('SCHEDULED', 'DRAWING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "lottery_registration_status" AS ENUM ('REGISTERED', 'WON', 'NOT_SELECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "notification_resource_type" ADD VALUE 'LOTTERY_ENTITLEMENT';

-- AlterTable
ALTER TABLE "purchase_entitlements" ADD COLUMN     "lottery_registration_id" UUID;

-- AlterTable
ALTER TABLE "ticket_types" ADD COLUMN     "presale_gate_closes_at" TIMESTAMPTZ(6),
ADD COLUMN     "presale_gate_opens_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "lottery_configs" (
    "id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "registration_opens_at" TIMESTAMPTZ(6) NOT NULL,
    "registration_closes_at" TIMESTAMPTZ(6) NOT NULL,
    "draw_at" TIMESTAMPTZ(6) NOT NULL,
    "allocation" INTEGER NOT NULL,
    "status" "lottery_config_status" NOT NULL DEFAULT 'SCHEDULED',
    "seed" VARCHAR(120),
    "drawn_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lottery_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lottery_registrations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "desired_quantity" INTEGER NOT NULL,
    "status" "lottery_registration_status" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "won_at" TIMESTAMPTZ(6),
    "not_selected_at" TIMESTAMPTZ(6),
    "withdrawn_at" TIMESTAMPTZ(6),
    "fulfilled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lottery_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lottery_draws" (
    "id" UUID NOT NULL,
    "lottery_config_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "seed" VARCHAR(120) NOT NULL,
    "registrant_count" INTEGER NOT NULL,
    "winners" JSONB NOT NULL,
    "allocation_consumed" INTEGER NOT NULL,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lottery_draws_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lottery_configs_ticket_type_id_key" ON "lottery_configs"("ticket_type_id");

-- CreateIndex
CREATE INDEX "lottery_configs_status_draw_at_idx" ON "lottery_configs"("status", "draw_at");

-- CreateIndex
CREATE INDEX "lottery_configs_concert_id_idx" ON "lottery_configs"("concert_id");

-- CreateIndex
CREATE INDEX "lottery_registrations_ticket_type_id_status_idx" ON "lottery_registrations"("ticket_type_id", "status");

-- CreateIndex
CREATE INDEX "lottery_registrations_user_id_ticket_type_id_status_idx" ON "lottery_registrations"("user_id", "ticket_type_id", "status");

-- CreateIndex
CREATE INDEX "lottery_registrations_concert_id_status_idx" ON "lottery_registrations"("concert_id", "status");

-- CreateIndex
CREATE INDEX "lottery_draws_lottery_config_id_idx" ON "lottery_draws"("lottery_config_id");

-- CreateIndex
CREATE INDEX "lottery_draws_ticket_type_id_idx" ON "lottery_draws"("ticket_type_id");

-- CreateIndex
CREATE INDEX "purchase_entitlements_lottery_registration_id_idx" ON "purchase_entitlements"("lottery_registration_id");

-- AddForeignKey
ALTER TABLE "purchase_entitlements" ADD CONSTRAINT "purchase_entitlements_lottery_registration_id_fkey" FOREIGN KEY ("lottery_registration_id") REFERENCES "lottery_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_configs" ADD CONSTRAINT "lottery_configs_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_configs" ADD CONSTRAINT "lottery_configs_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_registrations" ADD CONSTRAINT "lottery_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_registrations" ADD CONSTRAINT "lottery_registrations_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_registrations" ADD CONSTRAINT "lottery_registrations_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_draws" ADD CONSTRAINT "lottery_draws_lottery_config_id_fkey" FOREIGN KEY ("lottery_config_id") REFERENCES "lottery_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lottery_draws" ADD CONSTRAINT "lottery_draws_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (partial unique — Prisma cannot express partial unique indexes in schema.prisma;
-- hand-added after canonical generation, mirrors waitlist_entries_one_active_per_user_...; enforces one active registration per user)
CREATE UNIQUE INDEX "lottery_registrations_one_active_per_user_ticket_type_idx" ON "lottery_registrations"("user_id", "ticket_type_id") WHERE "status" = 'REGISTERED';
