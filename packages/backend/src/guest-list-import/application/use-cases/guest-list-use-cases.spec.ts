import { GuestListBatchStatus, GuestListRowDisposition } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuestListBatchRecord, ImportRowOutcome } from '../../domain/guest-list.types';
import { GuestListCsvParser } from '../../infrastructure/csv/guest-list-csv.parser';
import { ClaimGuestListImportUseCase } from './claim-guest-list-import.use-case';
import { DiscoverGuestListFilesUseCase } from './discover-guest-list-files.use-case';
import { ProcessGuestListImportUseCase } from './process-guest-list-import.use-case';
import { ReconcileGuestListJobsUseCase } from './reconcile-guest-list-jobs.use-case';

const batch: GuestListBatchRecord = {
  id: 'batch',
  concertId: 'concert',
  sourceName: 'vip.csv',
  sourceStorageKey: 'source.csv',
  sourceContentType: 'text/csv',
  checksum: 'a'.repeat(64),
  importSequence: 1,
  status: GuestListBatchStatus.PENDING,
  processingAttempt: 0,
  createdAt: new Date(),
};

describe('guest-list import use cases', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let repository: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queue: any;
  beforeEach(() => {
    repository = {
      concertExists: vi.fn().mockResolvedValue(true),
      claimBatch: vi.fn().mockResolvedValue({ batch, created: true }),
      findBatch: vi.fn().mockResolvedValue(batch),
      hasEarlierNonTerminal: vi.fn().mockResolvedValue(false),
      claimProcessingLease: vi
        .fn()
        .mockResolvedValue({ ...batch, status: GuestListBatchStatus.PROCESSING }),
      applyRow: vi
        .fn()
        .mockImplementation((_batch: unknown, row: ImportRowOutcome) => Promise.resolve(row)),
      summarizeRows: vi.fn().mockResolvedValue({
        totalRows: 2,
        validRows: 1,
        invalidRows: 1,
        duplicateRows: 0,
        importedRows: 1,
        updatedRows: 0,
        cancelledRows: 0,
        conflictRows: 0,
      }),
      listRows: vi.fn().mockResolvedValue([]),
      completeBatch: vi.fn(),
      failBatch: vi.fn(),
      releaseProcessingLease: vi.fn(),
      listPendingBatchIds: vi.fn().mockResolvedValue(['batch']),
    };
    storage = {
      put: vi.fn().mockResolvedValue({ storageKey: 'source.csv', sizeBytes: 100 }),
      get: vi.fn(),
    };
    queue = { ensureImportJob: vi.fn() };
  });

  it('claims by checksum and ensures a deterministic job for new or duplicate non-terminal batches', async () => {
    const useCase = new ClaimGuestListImportUseCase(repository, storage, queue);
    await expect(
      useCase.execute({
        concertId: 'concert',
        sourceName: 'vip.csv',
        contentType: 'text/csv',
        content: Buffer.from('csv'),
      }),
    ).resolves.toMatchObject({ outcome: 'CREATED' });
    expect(repository.claimBatch).toHaveBeenCalledWith(
      expect.objectContaining({ checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }),
    );
    expect(queue.ensureImportJob).toHaveBeenCalledWith('batch');
    repository.claimBatch.mockResolvedValue({ batch, created: false });
    await expect(
      useCase.execute({
        concertId: 'concert',
        sourceName: 'vip.csv',
        contentType: 'text/csv',
        content: Buffer.from('csv'),
      }),
    ).resolves.toMatchObject({ outcome: 'IDEMPOTENT_DUPLICATE' });
    expect(queue.ensureImportJob).toHaveBeenCalledTimes(2);
  });

  it('validates all headers before applying rows and records partial row failures', async () => {
    storage.get.mockResolvedValue(
      Buffer.from('guest_name,email,phone,external_ref\nVIP,vip@x.test,,\n,,bad,ext-2'),
    );
    const useCase = new ProcessGuestListImportUseCase(
      repository,
      storage,
      new GuestListCsvParser({ maxBytes: 1000, maxRows: 10 }),
      60000,
    );
    await useCase.execute('batch');
    expect(repository.applyRow).toHaveBeenCalledTimes(2);
    expect(repository.applyRow.mock.calls[1][1]).toMatchObject({
      disposition: GuestListRowDisposition.INVALID,
      rowNumber: 3,
    });
    expect(repository.completeBatch).toHaveBeenCalled();

    repository.applyRow.mockClear();
    storage.get.mockResolvedValue(Buffer.from('guest_name,email\nVIP,vip@x.test'));
    await useCase.execute('batch');
    expect(repository.applyRow).not.toHaveBeenCalled();
    expect(repository.failBatch).toHaveBeenCalledWith(
      'batch',
      'INVALID_HEADER',
      expect.any(String),
    );
  });

  it('releases a lease on retryable failure and records terminal failure only on final attempt', async () => {
    storage.get.mockRejectedValue(new Error('temporary'));
    const useCase = new ProcessGuestListImportUseCase(
      repository,
      storage,
      new GuestListCsvParser({ maxBytes: 1000, maxRows: 10 }),
      60000,
    );
    await expect(useCase.execute('batch')).rejects.toThrow('temporary');
    expect(repository.releaseProcessingLease).toHaveBeenCalledWith('batch');
    await expect(useCase.execute('batch', true)).rejects.toThrow('temporary');
    expect(repository.failBatch).toHaveBeenCalledWith('batch', 'PROCESSING_FAILED', 'temporary');
  });

  it('isolates discovery failures and reconciles pending batches', async () => {
    const source = {
      discover: vi.fn().mockResolvedValue([
        { concertId: 'c', sourceName: 'bad.csv' },
        { concertId: 'c', sourceName: 'good.csv' },
      ]),
      read: vi
        .fn()
        .mockRejectedValueOnce(new Error('missing'))
        .mockResolvedValueOnce(Buffer.from('csv')),
      archive: vi.fn(),
    };
    const claim = { execute: vi.fn().mockResolvedValue({ batch }) };
    const results = await new DiscoverGuestListFilesUseCase(
      source as never,
      claim as never,
    ).execute();
    expect(results).toEqual([
      { sourceName: 'bad.csv', ok: false, error: 'missing' },
      { sourceName: 'good.csv', ok: true },
    ]);
    expect(source.archive).toHaveBeenCalledTimes(1);
    await expect(new ReconcileGuestListJobsUseCase(repository, queue).execute()).resolves.toBe(1);
    expect(queue.ensureImportJob).toHaveBeenCalledWith('batch');
  });
});
