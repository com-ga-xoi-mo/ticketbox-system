import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IssueTicketsForPaidOrderUseCase,
  OrderStatus,
  TransitionOrderStatusUseCase,
} from '../../../ordering/order.module';
import { InventoryReservationConflictError } from '../../../ordering/domain/errors';
import { Payment } from '../../domain/payment.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  SuccessfulPaymentFinalizationOutcome,
  SuccessfulPaymentRecoverySource,
  type SuccessfulPaymentRecoveryState,
} from '../../domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from '../../domain/ports/payment-recovery-repository.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';

const completedAt = new Date('2026-06-24T07:00:00.000Z');

function payment(status = PaymentStatus.SUCCEEDED): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.VNPAY,
    providerTransactionId: 'provider-1',
    status,
    amountVnd: 1200000,
    redirectUrl: null,
    failureCode: null,
    failureMessage: null,
    createdAt: completedAt,
    updatedAt: completedAt,
    completedAt,
  });
}

function state(
  overrides: Partial<SuccessfulPaymentRecoveryState> = {},
): SuccessfulPaymentRecoveryState {
  return {
    paymentId: 'payment-1',
    orderId: 'order-1',
    paymentCompletedAt: completedAt,
    orderStatus: OrderStatus.PENDING_PAYMENT,
    expectedTicketCount: 1,
    existingTicketCount: 0,
    ...overrides,
  };
}

describe('FinalizeSuccessfulPaymentUseCase', () => {
  let paymentRepository: PaymentRepositoryPort;
  let recoveryRepository: PaymentRecoveryRepositoryPort;
  let transition: { execute: ReturnType<typeof vi.fn> };
  let issueTickets: { execute: ReturnType<typeof vi.fn> };
  let useCase: FinalizeSuccessfulPaymentUseCase;

  beforeEach(() => {
    paymentRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(payment()),
      findByProviderTransactionId: vi.fn(),
      recordEvent: vi.fn(),
      updateStatus: vi.fn(),
    };
    recoveryRepository = {
      findState: vi
        .fn()
        .mockResolvedValueOnce(state())
        .mockResolvedValueOnce(
          state({ orderStatus: OrderStatus.PAID, existingTicketCount: 0 }),
        )
        .mockResolvedValueOnce(
          state({ orderStatus: OrderStatus.PAID, existingTicketCount: 1 }),
        ),
      findCandidatePaymentIds: vi.fn(),
    };
    transition = { execute: vi.fn().mockResolvedValue({}) };
    issueTickets = { execute: vi.fn().mockResolvedValue([]) };
    useCase = new FinalizeSuccessfulPaymentUseCase(
      paymentRepository,
      recoveryRepository,
      transition as unknown as TransitionOrderStatusUseCase,
      issueTickets as unknown as IssueTicketsForPaidOrderUseCase,
    );
  });

  it('completes a successful payment whose order is still pending', async () => {
    const result = await useCase.execute({
      paymentId: 'payment-1',
      source: SuccessfulPaymentRecoverySource.CALLBACK,
    });

    expect(transition.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        status: OrderStatus.PAID,
      }),
    );
    expect(issueTickets.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      issuedAt: completedAt,
    });
    expect(result).toMatchObject({
      outcome: SuccessfulPaymentFinalizationOutcome.COMPLETED,
      orderTransitioned: true,
      ticketsComplete: true,
    });
  });

  it('finishes ticket issuance when the order commit succeeded before an error', async () => {
    transition.execute.mockRejectedValueOnce(new Error('publisher failed'));

    await expect(
      useCase.execute({
        paymentId: 'payment-1',
        source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
      }),
    ).resolves.toMatchObject({
      outcome: SuccessfulPaymentFinalizationOutcome.COMPLETED,
      ticketsComplete: true,
    });
    expect(issueTickets.execute).toHaveBeenCalledOnce();
  });

  it('does not revive a terminal order', async () => {
    vi.mocked(recoveryRepository.findState).mockReset();
    vi.mocked(recoveryRepository.findState).mockResolvedValue(
      state({ orderStatus: OrderStatus.EXPIRED }),
    );

    const result = await useCase.execute({
      paymentId: 'payment-1',
      source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
    });

    expect(result.outcome).toBe(
      SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
    );
    expect(transition.execute).not.toHaveBeenCalled();
    expect(issueTickets.execute).not.toHaveBeenCalled();
  });

  it('stops finalization when persisted reservation inventory conflicts', async () => {
    transition.execute.mockRejectedValue(
      new InventoryReservationConflictError('order-1'),
    );

    const result = await useCase.execute({
      paymentId: 'payment-1',
      source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
    });

    expect(result).toMatchObject({
      outcome: SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
      reason: 'InventoryReservationConflictError',
    });
    expect(issueTickets.execute).not.toHaveBeenCalled();
  });

  it('returns already complete without changing the order', async () => {
    vi.mocked(recoveryRepository.findState).mockReset();
    vi.mocked(recoveryRepository.findState).mockResolvedValue(
      state({
        orderStatus: OrderStatus.PAID,
        existingTicketCount: 1,
      }),
    );

    const result = await useCase.execute({
      paymentId: 'payment-1',
      source: SuccessfulPaymentRecoverySource.CALLBACK,
    });

    expect(result.outcome).toBe(
      SuccessfulPaymentFinalizationOutcome.ALREADY_COMPLETE,
    );
    expect(transition.execute).not.toHaveBeenCalled();
  });
});
