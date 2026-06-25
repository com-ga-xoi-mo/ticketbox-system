-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_amount_vnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promo_code" VARCHAR(80),
ADD COLUMN     "promotion_id" UUID,
ADD COLUMN     "service_fee_vnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal_vnd" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "discount_type" "discount_type" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "max_discount_vnd" INTEGER,
    "max_usage_count" INTEGER,
    "max_usage_per_user" INTEGER,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "applicable_event_ids" UUID[],
    "applicable_category_ids" UUID[],
    "applicable_ticket_type_ids" UUID[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotion_usages_promotion_id_user_id_idx" ON "promotion_usages"("promotion_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_usages_promotion_id_order_id_key" ON "promotion_usages"("promotion_id", "order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "promotions_lower_code_key" ON "promotions"(LOWER("code"));
