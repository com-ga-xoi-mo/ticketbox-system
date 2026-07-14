import { GuestListBatchStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import type { GuestListBatchRecord } from '../../domain/guest-list.types';
import {
  toAdminGuestListUploadResponse,
  toGuestListReport,
  toPublicGuestListBatch,
} from './admin-guest-list.mapper';

const now = new Date('2026-07-14T12:00:00.000Z');
const batch: GuestListBatchRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  concertId: '22222222-2222-4222-8222-222222222222',
  assetId: 'asset-secret',
  uploadedById: 'uploader-secret',
  sourceName: 'vip.csv',
  sourceStorageKey: '/private/source.csv',
  sourceContentType: 'text/csv',
  checksum: 'a'.repeat(64),
  importSequence: 3,
  status: GuestListBatchStatus.PROCESSING,
  processingAttempt: 2,
  totalRows: 10,
  validRows: 7,
  invalidRows: 1,
  duplicateRows: 1,
  importedRows: 5,
  updatedRows: 1,
  cancelledRows: 1,
  conflictRows: 1,
  leaseOwner: 'worker-secret',
  leaseExpiresAt: now,
  reportStorageKey: '/private/report.json',
  startedAt: now,
  createdAt: now,
  updatedAt: now,
};

describe('Admin guest-list public mappers', () => {
  it('serializes counters and timestamps using an explicit safe allowlist', () => {
    const result = toPublicGuestListBatch(batch);
    expect(result).toMatchObject({
      processingAttempt: 2,
      totalRows: 10,
      conflictRows: 1,
      reportAvailable: true,
      startedAt: now.toISOString(),
      completedAt: null,
    });
    expect(Object.keys(result).sort()).toEqual(
      [
        'id',
        'concertId',
        'sourceName',
        'checksum',
        'importSequence',
        'status',
        'reportAvailable',
        'processingAttempt',
        'totalRows',
        'validRows',
        'invalidRows',
        'duplicateRows',
        'importedRows',
        'updatedRows',
        'cancelledRows',
        'conflictRows',
        'failureCode',
        'failureMessage',
        'startedAt',
        'completedAt',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
  });

  it('derives report availability without exposing its storage key', () => {
    expect(toPublicGuestListBatch({ ...batch, reportStorageKey: undefined })).toMatchObject({
      reportAvailable: false,
    });
    expect(toPublicGuestListBatch(batch)).not.toHaveProperty('reportStorageKey');
  });

  it('validates canonical upload outcomes', () => {
    expect(toAdminGuestListUploadResponse({ outcome: 'CREATED', batch })).toMatchObject({
      outcome: 'CREATED',
      batch: { id: batch.id },
    });
  });

  it('normalizes optional report evidence to nullable public fields', () => {
    expect(
      toGuestListReport({
        batchId: batch.id,
        concertId: batch.concertId,
        checksum: batch.checksum,
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
        rows: [{ rowNumber: 2, action: 'UPSERT', disposition: 'INVALID' }],
      }),
    ).toMatchObject({
      rows: [
        {
          guestName: null,
          email: null,
          phone: null,
          externalRef: null,
          reasonCode: null,
          reasonMessage: null,
        },
      ],
    });
  });
});
