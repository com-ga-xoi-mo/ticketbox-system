-- CreateTable
CREATE TABLE "favorite_concerts" (
    "user_id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_concerts_pkey" PRIMARY KEY ("user_id","concert_id")
);

-- CreateIndex
CREATE INDEX "favorite_concerts_user_id_created_at_idx" ON "favorite_concerts"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "favorite_concerts" ADD CONSTRAINT "favorite_concerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_concerts" ADD CONSTRAINT "favorite_concerts_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
