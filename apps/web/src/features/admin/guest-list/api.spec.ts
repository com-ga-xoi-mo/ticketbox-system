import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClient from '../../../shared/api/client';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClient>();
  return { ...actual, get: http.get, post: http.post };
});

import { ApiError } from '../../../shared/api/client';
import { getGuestListReport, listGuestListBatches, uploadGuestList } from './api';
import type { GuestListReportUnavailableError } from './api';

const batchId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-07-14T12:00:00.000Z';
const batch = {
  id: batchId,
  concertId,
  sourceName: 'vip.csv',
  checksum: 'a'.repeat(64),
  importSequence: 1,
  status: 'PENDING',
  reportAvailable: false,
  processingAttempt: 0,
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  duplicateRows: 0,
  importedRows: 0,
  updatedRows: 0,
  cancelledRows: 0,
  conflictRows: 0,
  failureCode: null,
  failureMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

describe('guest-list Admin API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates upload requests and canonical responses', async () => {
    http.post.mockResolvedValue({ outcome: 'IDEMPOTENT_DUPLICATE', batch });
    await expect(
      uploadGuestList(concertId, {
        sourceName: 'vip.csv',
        contentType: 'text/csv',
        contentBase64: 'Y3N2',
      }),
    ).resolves.toMatchObject({ outcome: 'IDEMPOTENT_DUPLICATE' });
    expect(http.post).toHaveBeenCalledWith(
      `/admin/concerts/${concertId}/guest-list/imports`,
      expect.objectContaining({ sourceName: 'vip.csv' }),
    );
  });

  it('rejects unsafe unknown fields in list responses', async () => {
    http.get.mockResolvedValue([{ ...batch, sourceStorageKey: '/secret.csv' }]);
    await expect(listGuestListBatches(concertId)).rejects.toThrow(
      'Received an unexpected response from the server.',
    );
  });

  it('requires the public report-availability indicator', async () => {
    const missingIndicator = Object.fromEntries(
      Object.entries(batch).filter(([key]) => key !== 'reportAvailable'),
    );
    http.get.mockResolvedValue([missingIndicator]);
    await expect(listGuestListBatches(concertId)).rejects.toThrow(
      'Received an unexpected response from the server.',
    );
  });

  it('parses the shared structured non-reportable error', async () => {
    const body = {
      error: 'BATCH_NOT_COMPLETED',
      status: 'FAILED',
      message: 'Batch failed',
    } as const;
    http.get.mockRejectedValue(new ApiError(body.message, 422, undefined, body));
    await expect(getGuestListReport(concertId, batchId)).rejects.toMatchObject({
      name: 'GuestListReportUnavailableError',
      detail: body,
    } satisfies Partial<GuestListReportUnavailableError>);
  });
});
