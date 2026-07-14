import { describe, expect, it } from 'vitest';

import {
  AdminGuestListUploadRequestSchema,
  AdminGuestListUploadResponseSchema,
  GUEST_LIST_MAX_FILE_BYTES,
  GuestListBatchNotCompletedErrorSchema,
  GuestListReportSchema,
  PublicGuestListBatchSchema,
} from './guest-list-management.contract';

const batchId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-07-14T12:00:00.000Z';
const publicBatch = {
  id: batchId,
  concertId,
  sourceName: 'vip.csv',
  checksum: 'a'.repeat(64),
  importSequence: 1,
  status: 'COMPLETED_WITH_ERRORS',
  reportAvailable: true,
  processingAttempt: 1,
  totalRows: 2,
  validRows: 1,
  invalidRows: 1,
  duplicateRows: 0,
  importedRows: 1,
  updatedRows: 0,
  cancelledRows: 0,
  conflictRows: 0,
  failureCode: null,
  failureMessage: null,
  startedAt: timestamp,
  completedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

describe('Admin guest-list management contracts', () => {
  it('accepts canonical CSV upload envelopes and both outcomes', () => {
    const request = {
      sourceName: 'vip.csv',
      contentType: 'text/csv',
      contentBase64: Buffer.from('csv').toString('base64'),
    };
    expect(AdminGuestListUploadRequestSchema.parse(request)).toEqual(request);
    expect(
      AdminGuestListUploadResponseSchema.parse({ outcome: 'CREATED', batch: publicBatch }),
    ).toMatchObject({ outcome: 'CREATED' });
    expect(
      AdminGuestListUploadResponseSchema.parse({
        outcome: 'IDEMPOTENT_DUPLICATE',
        batch: publicBatch,
      }),
    ).toMatchObject({ outcome: 'IDEMPOTENT_DUPLICATE' });
  });

  it('rejects unknown upload fields, invalid Base64, unsupported MIME, and bounds', () => {
    const base = {
      sourceName: 'vip.csv',
      contentType: 'text/csv',
      contentBase64: 'Y3N2',
    };
    expect(
      AdminGuestListUploadRequestSchema.safeParse({ ...base, path: '/tmp/vip.csv' }).success,
    ).toBe(false);
    expect(
      AdminGuestListUploadRequestSchema.safeParse({ ...base, contentBase64: 'not base64' }).success,
    ).toBe(false);
    expect(
      AdminGuestListUploadRequestSchema.safeParse({ ...base, contentType: 'text/plain' }).success,
    ).toBe(false);
    expect(
      AdminGuestListUploadRequestSchema.safeParse({ ...base, sourceName: 'x'.repeat(181) }).success,
    ).toBe(false);
    expect(
      AdminGuestListUploadRequestSchema.safeParse({
        ...base,
        contentBase64: Buffer.alloc(GUEST_LIST_MAX_FILE_BYTES + 1).toString('base64'),
      }).success,
    ).toBe(false);
  });

  it('accepts nullable lifecycle/failure fields and rejects internal batch fields', () => {
    const pending = {
      ...publicBatch,
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
      failureCode: null,
      failureMessage: null,
    };
    expect(PublicGuestListBatchSchema.safeParse(pending).success).toBe(true);
    expect(
      PublicGuestListBatchSchema.safeParse({ ...pending, reportAvailable: false }).success,
    ).toBe(true);
    expect(
      PublicGuestListBatchSchema.safeParse({ ...pending, reportAvailable: 'yes' }).success,
    ).toBe(false);
    for (const internal of [
      'sourceStorageKey',
      'reportStorageKey',
      'leaseOwner',
      'leaseExpiresAt',
      'assetId',
      'uploadedById',
      'queueJobId',
    ]) {
      expect(
        PublicGuestListBatchSchema.safeParse({ ...publicBatch, [internal]: 'secret' }).success,
      ).toBe(false);
    }
  });

  it('validates nullable row evidence and rejects storage metadata in reports', () => {
    const report = {
      batchId,
      concertId,
      checksum: 'a'.repeat(64),
      summary: {
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        duplicateRows: 0,
        importedRows: 0,
        updatedRows: 0,
        cancelledRows: 0,
        conflictRows: 0,
      },
      rows: [
        {
          rowNumber: 2,
          action: 'UPSERT',
          guestName: null,
          email: null,
          phone: 'bad',
          externalRef: null,
          disposition: 'INVALID',
          reasonCode: 'ROW_VALIDATION',
          reasonMessage: 'Invalid phone',
        },
      ],
    };
    expect(GuestListReportSchema.parse(report)).toEqual(report);
    expect(
      GuestListReportSchema.safeParse({ ...report, reportStorageKey: 'reports/a.json' }).success,
    ).toBe(false);
  });

  it('accepts only non-reportable statuses in BATCH_NOT_COMPLETED errors', () => {
    expect(
      GuestListBatchNotCompletedErrorSchema.safeParse({
        error: 'BATCH_NOT_COMPLETED',
        status: 'FAILED',
        message: 'Batch failed',
      }).success,
    ).toBe(true);
    expect(
      GuestListBatchNotCompletedErrorSchema.safeParse({
        error: 'BATCH_NOT_COMPLETED',
        status: 'COMPLETED',
        message: 'Impossible',
      }).success,
    ).toBe(false);
  });
});
