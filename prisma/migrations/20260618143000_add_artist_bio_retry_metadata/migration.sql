ALTER TABLE "artist_bios"
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "max_attempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "last_attempted_at" TIMESTAMPTZ(6),
  ADD COLUMN "next_retry_at" TIMESTAMPTZ(6),
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "artist_bios_status_next_retry_at_idx"
  ON "artist_bios"("status", "next_retry_at");
