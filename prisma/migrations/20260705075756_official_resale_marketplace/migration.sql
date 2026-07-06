-- CreateEnum
CREATE TYPE "order_source_type" AS ENUM ('DIRECT', 'RESALE');

-- CreateEnum
CREATE TYPE "resale_listing_status" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('PENDING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "seller_trust_tier" AS ENUM ('NEW', 'TRUSTED', 'HIGHLY_TRUSTED', 'TOP_SELLER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ticket_status" ADD VALUE 'LISTED_FOR_RESALE';
ALTER TYPE "ticket_status" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "concerts" ADD COLUMN     "resale_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resale_max_price_percent" INTEGER NOT NULL DEFAULT 110;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_source_type" "order_source_type" NOT NULL DEFAULT 'DIRECT';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "transferred_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "resale_listings" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "asking_price_vnd" INTEGER NOT NULL,
    "original_price_vnd" INTEGER NOT NULL,
    "status" "resale_listing_status" NOT NULL DEFAULT 'ACTIVE',
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "sold_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_transactions" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "seller_ticket_id" UUID NOT NULL,
    "buyer_ticket_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "sale_price_vnd" INTEGER NOT NULL,
    "platform_fee_vnd" INTEGER NOT NULL,
    "seller_payout_vnd" INTEGER NOT NULL,
    "payout_status" "payout_status" NOT NULL DEFAULT 'PENDING',
    "payout_processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_upvotes" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_comments" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "flag_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listing_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_comment_replies" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "flag_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_flags" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "flagged_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_message_threads" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_read_by_recipient" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_trust_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trust_score" INTEGER NOT NULL,
    "completed_sales_count" INTEGER NOT NULL,
    "avg_response_time_minutes" INTEGER,
    "no_show_rate" DOUBLE PRECISION NOT NULL,
    "tier" "seller_trust_tier" NOT NULL DEFAULT 'NEW',
    "last_computed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_trust_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_upvotes_listing_id_user_id_key" ON "listing_upvotes"("listing_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_flags_comment_id_flagged_by_user_id_key" ON "comment_flags"("comment_id", "flagged_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_message_threads_listing_id_buyer_id_seller_id_key" ON "direct_message_threads"("listing_id", "buyer_id", "seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_trust_profiles_user_id_key" ON "seller_trust_profiles"("user_id");
