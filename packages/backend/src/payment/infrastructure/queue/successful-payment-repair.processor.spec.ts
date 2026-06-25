import { describe, expect, it, vi } from 'vitest';

import type { RepairSuccessfulPaymentsUseCase } from '../../application/use-cases/repair-successful-payments.use-case';
import { REPAIR_SUCCESSFUL_PAYMENTS_JOB } from './payment-recovery-queue.constants';
import { SuccessfulPaymentRepairProcessor } from './successful-payment-repair.processor';

function config(enabled = true) {
  return {
    paymentRepairEnabled: enabled,
    paymentRepairIntervalMs: 60_000,
    paymentRepairBatchSize: 50,
    paymentRepairMaxAttempts: 3,
    paymentRepairBackoffMs: 5_000,
  };
}

describe('SuccessfulPaymentRepairProcessor', () => {
  it('schedules bounded repeatable repair work', async () => {
    const queue = { add: vi.fn() };
    const useCase = { execute: vi.fn() };
    const processor = new SuccessfulPaymentRepairProcessor(
      useCase as unknown as RepairSuccessfulPaymentsUseCase,
      config() as never,
      queue as never,
    );

    await processor.onModuleInit();

    expect(queue.add).toHaveBeenCalledWith(
      REPAIR_SUCCESSFUL_PAYMENTS_JOB,
      {},
      expect.objectContaining({
        jobId: REPAIR_SUCCESSFUL_PAYMENTS_JOB,
        repeat: { every: 60_000 },
        attempts: 3,
      }),
    );
  });

  it('does not schedule when repair is disabled', async () => {
    const queue = { add: vi.fn() };
    const processor = new SuccessfulPaymentRepairProcessor(
      { execute: vi.fn() } as unknown as RepairSuccessfulPaymentsUseCase,
      config(false) as never,
      queue as never,
    );

    await processor.onModuleInit();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('requests a retry when a batch has retryable failures', async () => {
    const useCase = {
      execute: vi.fn().mockResolvedValue({
        scanned: 1,
        completed: 0,
        alreadyComplete: 0,
        retryable: 1,
        terminal: 0,
        retryablePaymentIds: ['payment-1'],
        terminalPaymentIds: [],
      }),
    };
    const processor = new SuccessfulPaymentRepairProcessor(
      useCase as unknown as RepairSuccessfulPaymentsUseCase,
      config() as never,
      { add: vi.fn() } as never,
    );

    await expect(processor.process({ id: 'job-1' } as never)).rejects.toThrow(
      'retryable failures',
    );
  });
});
