ALTER TABLE "notifications" ADD COLUMN "type" VARCHAR(80) NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" VARCHAR(220);

UPDATE "notifications"
SET "dedupe_key" = CONCAT('legacy:', "id"::text)
WHERE "dedupe_key" IS NULL;

ALTER TABLE "notifications" ALTER COLUMN "dedupe_key" SET NOT NULL;

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
