-- CreateEnum
CREATE TYPE "resale_order_status" AS ENUM ('RESERVED', 'PENDING_CONFIRM', 'COMPLETED', 'CANCELLED', 'IN_DISPUTE');

-- AlterEnum
ALTER TYPE "resale_listing_status" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "buyer_violation_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resale_market_suspended_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "seller_bank_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bank_account_name" VARCHAR(120) NOT NULL,
    "bank_account_number" VARCHAR(40) NOT NULL,
    "bank_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seller_bank_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_orders" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" "resale_order_status" NOT NULL DEFAULT 'RESERVED',
    "payment_proof_url" TEXT,
    "dispute_reason" TEXT,
    "dispute_raised_by" UUID,
    "resolved_by" UUID,
    "resolution_note" TEXT,
    "reserved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "disputed_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resale_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_bank_profiles_user_id_key" ON "seller_bank_profiles"("user_id");

-- CreateIndex
CREATE INDEX "resale_orders_listing_id_idx" ON "resale_orders"("listing_id");

-- CreateIndex
CREATE INDEX "resale_orders_buyer_id_status_idx" ON "resale_orders"("buyer_id", "status");

-- CreateIndex
CREATE INDEX "resale_orders_seller_id_status_idx" ON "resale_orders"("seller_id", "status");

-- AddForeignKey
ALTER TABLE "seller_bank_profiles" ADD CONSTRAINT "seller_bank_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_orders" ADD CONSTRAINT "resale_orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_orders" ADD CONSTRAINT "resale_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_orders" ADD CONSTRAINT "resale_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_transactions" ADD CONSTRAINT "resale_transactions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comments" ADD CONSTRAINT "listing_comments_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comment_replies" ADD CONSTRAINT "listing_comment_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_comment_replies" ADD CONSTRAINT "listing_comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "listing_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "listing_comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_threads" ADD CONSTRAINT "direct_message_threads_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_threads" ADD CONSTRAINT "direct_message_threads_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_message_threads" ADD CONSTRAINT "direct_message_threads_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "direct_message_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
