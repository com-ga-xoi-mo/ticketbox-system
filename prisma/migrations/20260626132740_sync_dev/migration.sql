-- AlterTable
ALTER TABLE "refund_request_status_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refund_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "support_request_status_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "support_requests" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "support_request_status_history_support_request_id_created_at_id" RENAME TO "support_request_status_history_support_request_id_created_a_idx";
