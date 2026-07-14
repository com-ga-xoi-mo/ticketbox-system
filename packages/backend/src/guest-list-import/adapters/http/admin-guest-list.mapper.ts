import {
  AdminGuestListUploadResponseSchema,
  GuestListBatchNotCompletedErrorSchema,
  GuestListReportSchema,
  PublicGuestListBatchSchema,
  type AdminGuestListUploadResponse,
  type GuestListBatchNotCompletedError,
  type GuestListImportOutcome,
  type GuestListReport,
  type PublicGuestListBatch,
} from '@ticketbox/api-types';

import type { GuestListBatchNotCompletedError as DomainBatchNotCompletedError } from '../../domain/errors';
import type { GuestListBatchRecord } from '../../domain/guest-list.types';

export function toPublicGuestListBatch(batch: GuestListBatchRecord): PublicGuestListBatch {
  return PublicGuestListBatchSchema.parse({
    id: batch.id,
    concertId: batch.concertId,
    sourceName: batch.sourceName,
    checksum: batch.checksum ?? null,
    importSequence: batch.importSequence,
    status: batch.status,
    reportAvailable: Boolean(batch.reportStorageKey),
    processingAttempt: batch.processingAttempt,
    totalRows: batch.totalRows,
    validRows: batch.validRows,
    invalidRows: batch.invalidRows,
    duplicateRows: batch.duplicateRows,
    importedRows: batch.importedRows,
    updatedRows: batch.updatedRows,
    cancelledRows: batch.cancelledRows,
    conflictRows: batch.conflictRows,
    failureCode: batch.failureCode ?? null,
    failureMessage: batch.failureMessage ?? null,
    startedAt: batch.startedAt?.toISOString() ?? null,
    completedAt: batch.completedAt?.toISOString() ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  });
}

export function toAdminGuestListUploadResponse(value: {
  outcome: GuestListImportOutcome;
  batch: GuestListBatchRecord;
}): AdminGuestListUploadResponse {
  return AdminGuestListUploadResponseSchema.parse({
    outcome: value.outcome,
    batch: toPublicGuestListBatch(value.batch),
  });
}

export function toGuestListReport(value: unknown): GuestListReport {
  const source = asRecord(value);
  const rows = Array.isArray(source.rows) ? source.rows : [];
  return GuestListReportSchema.parse({
    batchId: source.batchId,
    concertId: source.concertId,
    checksum: source.checksum ?? null,
    summary: source.summary,
    rows: rows.map((value) => {
      const row = asRecord(value);
      return {
        rowNumber: row.rowNumber,
        action: row.action === 'CANCEL' ? 'CANCEL' : 'UPSERT',
        guestName: row.guestName ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        externalRef: row.externalRef ?? null,
        disposition: row.disposition,
        reasonCode: row.reasonCode ?? null,
        reasonMessage: row.reasonMessage ?? null,
      };
    }),
  });
}

export function toGuestListBatchNotCompletedError(
  error: DomainBatchNotCompletedError,
): GuestListBatchNotCompletedError {
  return GuestListBatchNotCompletedErrorSchema.parse({
    error: 'BATCH_NOT_COMPLETED',
    status: error.batchStatus,
    message: error.message,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
