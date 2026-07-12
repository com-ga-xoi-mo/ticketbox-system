-- CreateEnum
CREATE TYPE "concert_review_status" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateTable
CREATE TABLE "concert_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000) NOT NULL,
    "status" "concert_review_status" NOT NULL DEFAULT 'VISIBLE',
    "hidden_at" TIMESTAMPTZ(6),
    "hidden_by_user_id" UUID,
    "hidden_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concert_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concert_reviews_concert_id_user_id_key" ON "concert_reviews"("concert_id", "user_id");

-- CreateIndex
CREATE INDEX "concert_reviews_concert_id_status_created_at_idx" ON "concert_reviews"("concert_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "concert_reviews_user_id_concert_id_idx" ON "concert_reviews"("user_id", "concert_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_concert_id_status_idx" ON "tickets"("user_id", "concert_id", "status");

-- AddForeignKey
ALTER TABLE "concert_reviews" ADD CONSTRAINT "concert_reviews_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_reviews" ADD CONSTRAINT "concert_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_reviews" ADD CONSTRAINT "concert_reviews_hidden_by_user_id_fkey" FOREIGN KEY ("hidden_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
