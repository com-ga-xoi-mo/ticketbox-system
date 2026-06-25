-- CreateEnum
CREATE TYPE "artist_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "asset_kind" ADD VALUE 'ARTIST_AVATAR';
ALTER TYPE "asset_kind" ADD VALUE 'ARTIST_POSTER';

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "display_name" VARCHAR(220) NOT NULL,
    "bio" TEXT,
    "avatar_asset_id" UUID,
    "poster_asset_id" UUID,
    "status" "artist_status" NOT NULL DEFAULT 'ACTIVE',
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concert_artists" (
    "concert_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concert_artists_pkey" PRIMARY KEY ("concert_id","artist_id")
);

-- CreateTable
CREATE TABLE "artist_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artists_slug_key" ON "artists"("slug");

-- CreateIndex
CREATE INDEX "artists_slug_idx" ON "artists"("slug");

-- CreateIndex
CREATE INDEX "artists_status_idx" ON "artists"("status");

-- CreateIndex
CREATE INDEX "artists_status_favorite_count_idx" ON "artists"("status", "favorite_count");

-- CreateIndex
CREATE INDEX "concert_artists_artist_id_idx" ON "concert_artists"("artist_id");

-- CreateIndex
CREATE INDEX "artist_follows_artist_id_idx" ON "artist_follows"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_follows_user_id_artist_id_key" ON "artist_follows"("user_id", "artist_id");

-- CreateIndex
CREATE INDEX "artist_favorites_artist_id_idx" ON "artist_favorites"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_favorites_user_id_artist_id_key" ON "artist_favorites"("user_id", "artist_id");

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_poster_asset_id_fkey" FOREIGN KEY ("poster_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_artists" ADD CONSTRAINT "concert_artists_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concert_artists" ADD CONSTRAINT "concert_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_follows" ADD CONSTRAINT "artist_follows_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_favorites" ADD CONSTRAINT "artist_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_favorites" ADD CONSTRAINT "artist_favorites_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
