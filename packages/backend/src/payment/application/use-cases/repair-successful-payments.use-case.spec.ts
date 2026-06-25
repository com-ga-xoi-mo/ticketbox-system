import { describe, expect, it, vi } from 'vitest';

import {
  SuccessfulPaymentFinalizationOutcome,
  SuccessfulPaymentRecoverySource,
} from '../../domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from '../../domain/ports/payment-recovery-repository.port';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';
import { RepairSuccessfulPaymentsUseCase } from './repair-successful-payments.use-case';

describe('RepairSuccessfulPaymentsUseCase', () => {
  it('repairs candidates through the shared finalizer and classifies outcomes', async () => {
    const repository: PaymentRecoveryRepositoryPort = {
      findState: vi.fn(),
      findCandidatePaymentIds: vi.fn().mockResolvedValue([
        'payment-1',
        'payment-2',
        'payment-3',
      ]),
    };
    const finalizer = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          outcome: SuccessfulPaymentFinalizationOutcome.COMPLETED,
        })
        .mockResolvedValueOnce({
          outcome: SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
        })
        .mockResolvedValueOnce({
          outcome: SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
        }),
    };
    const useCase = new RepairSuccessfulPaymentsUseCase(
      repository,
      finalizer as unknown as FinalizeSuccessfulPaymentUseCase,
    );

    await expect(useCase.execute({ limit: 25 })).resolves.toEqual({
      scanned: 3,
      completed: 1,
      alreadyComplete: 0,
      retryable: 1,
      terminal: 1,
      retryablePaymentIds: ['payment-2'],
      terminalPaymentIds: ['payment-3'],
    });
    expect(repository.findCandidatePaymentIds).toHaveBeenCalledWith(25);
    expect(finalizer.execute).toHaveBeenNthCalledWith(1, {
      paymentId: 'payment-1',
      source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
    });
  });
});
