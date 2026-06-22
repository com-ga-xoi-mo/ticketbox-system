import { GuestListBatchStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { GUEST_LIST_IMPORT_REQUESTED_JOB } from '../../../platform/queue/platform-queue.constants';
import { ReconcileGuestListJobsUseCase } from '../../application/use-cases/reconcile-guest-list-jobs.use-case';
import { GuestListImportProducer } from './guest-list-import.producer';

describe('GuestListImportProducer', () => {
  const config = { guestListMaxAttempts: 5, guestListRetryBackoffMs: 1000 };
  const repository = {
    findBatch: vi.fn().mockResolvedValue({ status: GuestListBatchStatus.PENDING }),
  };
  it('creates one deterministic logical job and repairs a missing job', async () => {
    const queue = { getJob: vi.fn().mockResolvedValue(null), add: vi.fn() };
    await new GuestListImportProducer(
      queue as never,
      config as never,
      repository as never,
    ).ensureImportJob('batch');
    expect(queue.add).toHaveBeenCalledWith(
      GUEST_LIST_IMPORT_REQUESTED_JOB,
      { version: 1, batchId: 'batch' },
      expect.objectContaining({ jobId: 'guest-list-batch', attempts: 5 }),
    );
  });
  it.each(['waiting', 'delayed', 'active'])(
    'retains an existing runnable %s job',
    async (state) => {
      const queue = {
        getJob: vi.fn().mockResolvedValue({ getState: vi.fn().mockResolvedValue(state) }),
        add: vi.fn(),
      };
      await new GuestListImportProducer(
        queue as never,
        config as never,
        repository as never,
      ).ensureImportJob('batch');
      expect(queue.add).not.toHaveBeenCalled();
    },
  );
  it.each(['failed', 'completed'])(
    'repairs a retained %s job with the same deterministic ID',
    async (state) => {
      const job = {
        getState: vi.fn().mockResolvedValue(state),
        retry: vi.fn().mockResolvedValue(undefined),
      };
      const queue = { getJob: vi.fn().mockResolvedValue(job), add: vi.fn() };
      await new GuestListImportProducer(
        queue as never,
        config as never,
        repository as never,
      ).ensureImportJob('batch');
      expect(job.retry).toHaveBeenCalledWith(state);
      expect(queue.add).not.toHaveBeenCalled();
    },
  );
  it('tolerates a repair race that already restored a runnable job', async () => {
    const failed = {
      getState: vi.fn().mockResolvedValue('failed'),
      retry: vi.fn().mockRejectedValue(new Error('race')),
    };
    const waiting = { getState: vi.fn().mockResolvedValue('waiting') };
    const queue = { getJob: vi.fn().mockResolvedValueOnce(failed).mockResolvedValue(waiting) };
    await expect(
      new GuestListImportProducer(
        queue as never,
        config as never,
        repository as never,
      ).ensureImportJob('batch'),
    ).resolves.toBeUndefined();
  });
  it('does not enqueue terminal database batches', async () => {
    const queue = { getJob: vi.fn(), add: vi.fn() };
    const terminalRepository = {
      findBatch: vi.fn().mockResolvedValue({ status: GuestListBatchStatus.COMPLETED }),
    };
    await new GuestListImportProducer(
      queue as never,
      config as never,
      terminalRepository as never,
    ).ensureImportJob('batch');
    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
  it.each([GuestListBatchStatus.PENDING, GuestListBatchStatus.PROCESSING])(
    'lets reconciliation repair a retained failed job for a recoverable %s batch',
    async (status) => {
      const job = {
        getState: vi.fn().mockResolvedValue('failed'),
        retry: vi.fn().mockResolvedValue(undefined),
      };
      const queue = { getJob: vi.fn().mockResolvedValue(job), add: vi.fn() };
      const recoverableRepository = {
        findBatch: vi.fn().mockResolvedValue({ status }),
        listPendingBatchIds: vi.fn().mockResolvedValue(['batch']),
      };
      const producer = new GuestListImportProducer(
        queue as never,
        config as never,
        recoverableRepository as never,
      );
      await expect(
        new ReconcileGuestListJobsUseCase(recoverableRepository as never, producer).execute(),
      ).resolves.toBe(1);
      expect(job.retry).toHaveBeenCalledWith('failed');
    },
  );
});
