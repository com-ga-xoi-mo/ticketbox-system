-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterEnum
ALTER TYPE "asset_kind" ADD VALUE 'USER_AVATAR';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address_line" VARCHAR(255),
ADD COLUMN     "avatar_asset_id" UUID,
ADD COLUMN     "city" VARCHAR(120),
ADD COLUMN     "date_of_birth" TIMESTAMPTZ(6),
ADD COLUMN     "district" VARCHAR(120),
ADD COLUMN     "gender" "gender",
ADD COLUMN     "phone" VARCHAR(40);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
