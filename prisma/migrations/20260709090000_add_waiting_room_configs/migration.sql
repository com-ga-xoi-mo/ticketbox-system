-- CreateEnum
CREATE TYPE "waiting_room_manual_override" AS ENUM ('NONE', 'FORCE_ON', 'FORCE_OFF');

-- CreateTable
CREATE TABLE "waiting_room_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_activate" BOOLEAN NOT NULL DEFAULT false,
    "manual_override" "waiting_room_manual_override" NOT NULL DEFAULT 'NONE',
    "max_concurrency" INTEGER NOT NULL DEFAULT 500,
    "admission_ttl_seconds" INTEGER NOT NULL DEFAULT 600,
    "activate_threshold" INTEGER NOT NULL DEFAULT 500,
    "deactivate_threshold" INTEGER NOT NULL DEFAULT 100,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waiting_room_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waiting_room_configs_concert_id_key" ON "waiting_room_configs"("concert_id");

-- CreateIndex
CREATE INDEX "waiting_room_configs_enabled_auto_activate_idx" ON "waiting_room_configs"("enabled", "auto_activate");

-- CreateIndex
CREATE INDEX "waiting_room_configs_manual_override_idx" ON "waiting_room_configs"("manual_override");

-- AddForeignKey
ALTER TABLE "waiting_room_configs" ADD CONSTRAINT "waiting_room_configs_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
