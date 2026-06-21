-- Preserve row-level evidence before converting guest_list_entries into the active projection.
CREATE TYPE "guest_list_row_disposition" AS ENUM ('IMPORTED', 'UPDATED', 'CANCELLED', 'INVALID', 'DUPLICATE', 'CONFLICT');

ALTER TABLE "guest_list_batches"
  ADD COLUMN "checksum" CHAR(64),
  ADD COLUMN "import_sequence" INTEGER,
  ADD COLUMN "processing_attempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lease_owner" VARCHAR(180),
  ADD COLUMN "lease_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "imported_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updated_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancelled_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "conflict_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "report_storage_key" TEXT,
  ADD COLUMN "report_content_type" VARCHAR(160),
  ADD COLUMN "failure_code" VARCHAR(120),
  ADD COLUMN "failure_message" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "guest_list_batches" b
SET "checksum" = lower(a."checksum")
FROM "assets" a
WHERE b."asset_id" = a."id" AND a."checksum" ~ '^[0-9A-Fa-f]{64}$';

WITH sequenced AS (
  SELECT id, row_number() OVER (PARTITION BY "concert_id" ORDER BY "created_at", id)::integer AS seq
  FROM "guest_list_batches"
)
UPDATE "guest_list_batches" b SET "import_sequence" = s.seq FROM sequenced s WHERE b.id = s.id;

ALTER TABLE "guest_list_batches" ALTER COLUMN "import_sequence" SET NOT NULL;

CREATE TABLE "guest_list_import_rows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "action" VARCHAR(16),
  "guest_name" VARCHAR(180),
  "email" VARCHAR(320),
  "normalized_email" VARCHAR(320),
  "phone" VARCHAR(40),
  "normalized_phone" VARCHAR(40),
  "external_ref" VARCHAR(160),
  "disposition" "guest_list_row_disposition" NOT NULL,
  "reason_code" VARCHAR(120),
  "reason_message" TEXT,
  "guest_entry_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_list_import_rows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guest_list_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "guest_list_batches"("id") ON DELETE CASCADE
);

INSERT INTO "guest_list_import_rows" (
  "batch_id", "row_number", "guest_name", "email", "normalized_email", "phone", "external_ref", "disposition", "reason_message", "created_at", "updated_at"
)
SELECT "batch_id", "row_number", "guest_name", "email", "normalized_email", "phone", "external_ref",
  CASE "status"::text
    WHEN 'INVALID' THEN 'INVALID'::"guest_list_row_disposition"
    WHEN 'DUPLICATE' THEN 'DUPLICATE'::"guest_list_row_disposition"
    ELSE 'IMPORTED'::"guest_list_row_disposition"
  END,
  "error_message", "created_at", "created_at"
FROM "guest_list_entries";

-- INVALID/DUPLICATE legacy rows are evidence, not active guests.
DELETE FROM "guest_list_entries" WHERE "status"::text IN ('INVALID', 'DUPLICATE');

ALTER TABLE "guest_list_entries" RENAME COLUMN "batch_id" TO "latest_batch_id";
ALTER TABLE "guest_list_entries"
  ADD COLUMN "concert_id" UUID,
  ADD COLUMN "normalized_phone" VARCHAR(40),
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "guest_list_entries" e
SET "concert_id" = b."concert_id",
    "normalized_phone" = CASE WHEN e."phone" IS NULL THEN NULL ELSE regexp_replace(e."phone", '[^0-9+]', '', 'g') END
FROM "guest_list_batches" b WHERE e."latest_batch_id" = b.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT "concert_id", "normalized_email" FROM "guest_list_entries" WHERE "normalized_email" IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1
      UNION ALL SELECT "concert_id", "normalized_phone" FROM "guest_list_entries" WHERE "normalized_phone" IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1
      UNION ALL SELECT "concert_id", "external_ref" FROM "guest_list_entries" WHERE "external_ref" IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1
    ) conflicts
  ) THEN RAISE EXCEPTION 'guest-list migration found conflicting concert-scoped natural identifiers'; END IF;
END $$;

UPDATE "guest_list_batches" SET "status" = 'PENDING', "started_at" = NULL WHERE "status" = 'PROCESSING';

ALTER TABLE "guest_list_entries" ALTER COLUMN "concert_id" SET NOT NULL;

ALTER TABLE "guest_list_entries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "guest_list_entry_status" RENAME TO "guest_list_entry_status_legacy";
CREATE TYPE "guest_list_entry_status" AS ENUM ('ACTIVE', 'CANCELLED');
ALTER TABLE "guest_list_entries" ALTER COLUMN "status" TYPE "guest_list_entry_status"
USING ('ACTIVE'::"guest_list_entry_status");
ALTER TABLE "guest_list_entries" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "guest_list_entry_status_legacy";

ALTER TABLE "guest_list_entries"
  DROP COLUMN "row_number",
  DROP COLUMN "error_message";

ALTER TABLE "guest_list_entries" DROP CONSTRAINT IF EXISTS "guest_list_entries_batch_id_external_ref_key";
ALTER TABLE "guest_list_entries" DROP CONSTRAINT IF EXISTS "guest_list_entries_batch_id_normalized_email_key";
ALTER TABLE "guest_list_entries" DROP CONSTRAINT IF EXISTS "guest_list_entries_batch_id_fkey";
ALTER TABLE "guest_list_entries"
  ADD CONSTRAINT "guest_list_entries_latest_batch_id_fkey" FOREIGN KEY ("latest_batch_id") REFERENCES "guest_list_batches"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "guest_list_entries_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "guest_list_entries_natural_identifier_check" CHECK ("normalized_email" IS NOT NULL OR "normalized_phone" IS NOT NULL OR "external_ref" IS NOT NULL),
  ADD CONSTRAINT "guest_list_entries_cancelled_at_check" CHECK (("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL) OR ("status" = 'ACTIVE' AND "cancelled_at" IS NULL));

ALTER TABLE "guest_list_batches"
  ADD CONSTRAINT "guest_list_batches_checksum_format_check" CHECK ("checksum" IS NULL OR "checksum" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "guest_list_batches_processing_lease_check" CHECK (("status" = 'PROCESSING' AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL) OR "status" <> 'PROCESSING');

CREATE UNIQUE INDEX "guest_list_batches_concert_checksum_key" ON "guest_list_batches"("concert_id", "checksum") WHERE "checksum" IS NOT NULL;
CREATE UNIQUE INDEX "guest_list_batches_concert_sequence_key" ON "guest_list_batches"("concert_id", "import_sequence");
CREATE UNIQUE INDEX "guest_list_import_rows_batch_row_key" ON "guest_list_import_rows"("batch_id", "row_number");
CREATE INDEX "guest_list_import_rows_batch_disposition_idx" ON "guest_list_import_rows"("batch_id", "disposition");
CREATE UNIQUE INDEX "guest_list_entries_concert_email_key" ON "guest_list_entries"("concert_id", "normalized_email") WHERE "normalized_email" IS NOT NULL;
CREATE UNIQUE INDEX "guest_list_entries_concert_phone_key" ON "guest_list_entries"("concert_id", "normalized_phone") WHERE "normalized_phone" IS NOT NULL;
CREATE UNIQUE INDEX "guest_list_entries_concert_external_ref_key" ON "guest_list_entries"("concert_id", "external_ref") WHERE "external_ref" IS NOT NULL;
CREATE INDEX "guest_list_entries_concert_status_idx" ON "guest_list_entries"("concert_id", "status");
CREATE INDEX "guest_list_batches_status_lease_idx" ON "guest_list_batches"("status", "lease_expires_at");
