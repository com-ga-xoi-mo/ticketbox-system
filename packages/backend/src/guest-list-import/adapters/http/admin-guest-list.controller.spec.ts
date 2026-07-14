import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { GuestListBatchStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { Role } from '../../../identity/domain/role.enum';
import { GuestListBatchNotCompletedError } from '../../domain/errors';
import type { GuestListBatchRecord } from '../../domain/guest-list.types';
import { AdminGuestListController } from './admin-guest-list.controller';
import { AdminGuestListUploadRequestPipe } from './dto/admin-guest-list-upload.pipe';

const batchId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-07-14T12:00:00.000Z');
const user = { id: 'admin', email: 'admin@ticketbox.test', roles: [Role.ADMIN] };
const batch: GuestListBatchRecord = {
  id: batchId,
  concertId,
  assetId: 'internal-asset',
  uploadedById: 'internal-uploader',
  sourceName: 'vip.csv',
  sourceStorageKey: 'sources/private.csv',
  sourceContentType: 'text/csv',
  checksum: 'a'.repeat(64),
  importSequence: 1,
  status: GuestListBatchStatus.COMPLETED_WITH_ERRORS,
  processingAttempt: 1,
  totalRows: 2,
  validRows: 1,
  invalidRows: 1,
  duplicateRows: 0,
  importedRows: 1,
  updatedRows: 0,
  cancelledRows: 0,
  conflictRows: 0,
  leaseOwner: 'internal-worker',
  leaseExpiresAt: now,
  reportStorageKey: 'reports/private.json',
  createdAt: now,
  updatedAt: now,
  startedAt: now,
  completedAt: now,
};

function makeController(overrides?: { report?: ReturnType<typeof vi.fn> }) {
  const claim = {
    execute: vi.fn().mockResolvedValue({ outcome: 'IDEMPOTENT_DUPLICATE', batch }),
  };
  const discovery = { execute: vi.fn().mockResolvedValue([]) };
  const batches = {
    list: vi.fn().mockResolvedValue([batch]),
    get: vi.fn().mockResolvedValue(batch),
    report:
      overrides?.report ??
      vi.fn().mockResolvedValue(
        Buffer.from(
          JSON.stringify({
            batchId,
            concertId,
            checksum: 'a'.repeat(64),
            summary: {
              totalRows: 1,
              validRows: 1,
              invalidRows: 0,
              duplicateRows: 0,
              importedRows: 1,
              updatedRows: 0,
              cancelledRows: 0,
              conflictRows: 0,
            },
            rows: [
              {
                rowNumber: 2,
                action: 'UPSERT',
                guestName: 'VIP',
                email: 'vip@ticketbox.test',
                disposition: 'IMPORTED',
                guestEntryId: 'internal-entry',
              },
            ],
            reportStorageKey: 'internal-report-key',
          }),
        ),
      ),
  };
  const authorize = { execute: vi.fn() };
  return {
    controller: new AdminGuestListController(
      claim as never,
      discovery as never,
      batches as never,
      authorize as never,
    ),
    claim,
    batches,
    authorize,
  };
}

describe('AdminGuestListController', () => {
  it('uses the strict shared upload schema before invoking the claim use case', () => {
    const pipe = new AdminGuestListUploadRequestPipe();
    const valid = {
      sourceName: ' vip.csv ',
      contentType: 'text/csv',
      contentBase64: Buffer.from('csv').toString('base64'),
    };
    expect(pipe.transform(valid)).toMatchObject({ sourceName: 'vip.csv' });
    expect(() => pipe.transform({ ...valid, unexpected: true })).toThrow(BadRequestException);
    expect(() => pipe.transform({ ...valid, contentType: 'text/plain' })).toThrow(
      BadRequestException,
    );
  });

  it('maps upload, list, detail, and report through safe public contracts', async () => {
    const { controller, authorize } = makeController();
    const request = {
      sourceName: 'vip.csv',
      contentType: 'text/csv' as const,
      contentBase64: Buffer.from('csv').toString('base64'),
    };
    const upload = await controller.requestImport(concertId, request, { user });
    expect(upload).toMatchObject({
      outcome: 'IDEMPOTENT_DUPLICATE',
      batch: {
        id: batchId,
        totalRows: 2,
        reportAvailable: true,
        completedAt: now.toISOString(),
      },
    });
    expect(upload.batch).not.toHaveProperty('sourceStorageKey');
    expect(upload.batch).not.toHaveProperty('leaseOwner');
    expect(authorize.execute).toHaveBeenCalled();

    const listed = await controller.list(concertId, { user });
    const detail = await controller.get(concertId, batchId, { user });
    expect(listed).toEqual([detail]);
    expect(detail).not.toHaveProperty('reportStorageKey');

    const report = await controller.report(concertId, batchId, { user });
    expect(report.rows[0]).toEqual({
      rowNumber: 2,
      action: 'UPSERT',
      guestName: 'VIP',
      email: 'vip@ticketbox.test',
      phone: null,
      externalRef: null,
      disposition: 'IMPORTED',
      reasonCode: null,
      reasonMessage: null,
    });
    expect(report).not.toHaveProperty('reportStorageKey');
  });

  it('returns 422 with the shared body when a batch is not reportable', async () => {
    const report = vi
      .fn()
      .mockRejectedValue(new GuestListBatchNotCompletedError(batchId, 'FAILED'));
    const { controller } = makeController({ report });
    await expect(controller.report(concertId, batchId, { user })).rejects.toThrow(
      UnprocessableEntityException,
    );
    try {
      await controller.report(concertId, batchId, { user });
    } catch (error) {
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        error: 'BATCH_NOT_COMPLETED',
        status: 'FAILED',
        message: `Cannot retrieve report: batch ${batchId} has status FAILED`,
      });
    }
  });

  it('preserves unexpected report failures', async () => {
    const unexpected = new Error('storage unavailable');
    const { controller } = makeController({ report: vi.fn().mockRejectedValue(unexpected) });
    await expect(controller.report(concertId, batchId, { user })).rejects.toBe(unexpected);
  });
});
