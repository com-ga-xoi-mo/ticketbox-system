-- Add per-lottery entitlement TTL for manual organizer control.
ALTER TABLE "lottery_configs"
ADD COLUMN "entitlement_ttl_minutes" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "lottery_configs"
ADD CONSTRAINT "lottery_configs_entitlement_ttl_minutes_check" CHECK ("entitlement_ttl_minutes" >= 1);
