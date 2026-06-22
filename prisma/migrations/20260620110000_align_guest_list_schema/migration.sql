-- Align the hand-authored guest-list migration with the Prisma datamodel.
DROP INDEX "guest_list_entries_batch_id_external_ref_key";
DROP INDEX "guest_list_entries_batch_id_normalized_email_key";
DROP INDEX "guest_list_entries_batch_id_status_idx";

ALTER TABLE "guest_list_batches"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "guest_list_entries"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "guest_list_import_rows"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "guest_list_entries"
  DROP CONSTRAINT "guest_list_entries_concert_id_fkey",
  DROP CONSTRAINT "guest_list_entries_latest_batch_id_fkey";

ALTER TABLE "guest_list_import_rows"
  DROP CONSTRAINT "guest_list_import_rows_batch_id_fkey";

ALTER TABLE "guest_list_entries"
  ADD CONSTRAINT "guest_list_entries_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "guest_list_entries_latest_batch_id_fkey"
    FOREIGN KEY ("latest_batch_id") REFERENCES "guest_list_batches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_list_import_rows"
  ADD CONSTRAINT "guest_list_import_rows_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "guest_list_batches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "guest_list_entries_latest_batch_id_idx"
  ON "guest_list_entries"("latest_batch_id");

ALTER INDEX "guest_list_batches_concert_sequence_key"
  RENAME TO "guest_list_batches_concert_id_import_sequence_key";
ALTER INDEX "guest_list_batches_status_lease_idx"
  RENAME TO "guest_list_batches_status_lease_expires_at_idx";
ALTER INDEX "guest_list_entries_concert_status_idx"
  RENAME TO "guest_list_entries_concert_id_status_idx";
ALTER INDEX "guest_list_import_rows_batch_disposition_idx"
  RENAME TO "guest_list_import_rows_batch_id_disposition_idx";
ALTER INDEX "guest_list_import_rows_batch_row_key"
  RENAME TO "guest_list_import_rows_batch_id_row_number_key";
