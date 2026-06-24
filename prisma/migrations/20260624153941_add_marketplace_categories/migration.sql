-- CreateEnum
CREATE TYPE "event_type" AS ENUM ('CONCERT', 'WORKSHOP', 'SPORT', 'MOVIE', 'THEATRE', 'VOUCHER');

-- AlterTable
ALTER TABLE "concerts" ADD COLUMN     "banner_asset_id" UUID,
ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "event_type" "event_type" NOT NULL DEFAULT 'CONCERT',
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seo_description" VARCHAR(320),
ADD COLUMN     "seo_image_url" TEXT,
ADD COLUMN     "seo_title" VARCHAR(160);

-- CreateIndex
CREATE INDEX "concerts_is_featured_display_order_starts_at_idx" ON "concerts"("is_featured", "display_order", "starts_at");

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_banner_asset_id_fkey" FOREIGN KEY ("banner_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
