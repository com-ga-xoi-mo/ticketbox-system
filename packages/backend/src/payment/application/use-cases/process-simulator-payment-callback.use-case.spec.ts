import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../../ordering/order.module';
import type { TransitionOrderStatusUseCase } from '../../../ordering/order.module';
import { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { ProcessSimulatorPaymentCallbackUseCase } from './process-simulator-payment-callback.use-case';

function buildPayment(status = PaymentStatus.PENDING): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.SIMULATOR,
    providerTransactionId: 'sim-payment-1',
    status,
    amountVnd: 2400000,
    redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-19T10:01:00.000Z'),
    updatedAt: new Date('2026-06-19T10:01:00.000Z'),
    completedAt: null,
  });
}

describe('ProcessSimulatorPaymentCallbackUseCase', () => {
  let paymentRepository: PaymentRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let transitionOrderStatusUseCase: { execute: ReturnType<typeof vi.fn> };
  let useCase: ProcessSimulatorPaymentCallbackUseCase;

  beforeEach(() => {
    paymentRepository = {
      create: vi.fn(),
      findById: vi.fn(async () => buildPayment()),
      findByProviderTransactionId: vi.fn(),
      recordEvent: vi.fn(async () => ({ duplicate: false })),
      updateStatus: vi.fn(async ({ status }) => buildPayment(status)),
    };
    paymentGateway = {
      createRedirectSession: vi.fn(),
      verifySimulatorToken: vi.fn(() => ({
        paymentId: 'payment-1',
        orderId: 'order-1',
        userId: 'user-1',
        providerTransactionId: 'sim-payment-1',
      })),
      verifyMomoIpnPayload: vi.fn(),
      verifyVnpayCallbackPayload: vi.fn(),
    };
    transitionOrderStatusUseCase = { execute: vi.fn(async () => undefined) };
    useCase = new ProcessSimulatorPaymentCallbackUseCase(
      paymentRepository,
      paymentGateway,
      transitionOrderStatusUseCase as unknown as TransitionOrderStatusUseCase,
    );
  });

  it('marks successful simulator callback as paid and transitions the order', async () => {
    const result = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
    });

    expect(paymentRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: PaymentEventType.CALLBACK_RECEIVED,
        providerEventId: 'sim-payment-1:success',
      }),
    );
    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
    );
    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        status: OrderStatus.PAID,
        skipOwnershipCheck: true,
      }),
    );
    expect(result.orderTransitioned).toBe(true);
  });

  it('marks failed simulator callback as failed and does not mark paid', async () => {
    const result = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.FAILURE,
    });

    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.FAILED,
        failureCode: 'SIMULATED_FAILURE',
      }),
    );
    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        status: OrderStatus.FAILED,
      }),
    );
    expect(result.payment.status).toBe(PaymentStatus.FAILED);
  });

  it('leaves timeout outcome pending', async () => {
    const result = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.TIMEOUT,
    });

    expect(paymentRepository.recordEvent).not.toHaveBeenCalled();
    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
    expect(transitionOrderStatusUseCase.execute).not.toHaveBeenCalled();
    expect(result.payment.status).toBe(PaymentStatus.PENDING);
  });

  it('does not transition the order for delayed outcomes before callback delivery', async () => {
    const result = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.DELAYED_SUCCESS,
    });

    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
    expect(transitionOrderStatusUseCase.execute).not.toHaveBeenCalled();
    expect(result.orderTransitioned).toBe(false);
  });

  it('ignores duplicate successful callback after the first provider event', async () => {
    vi.mocked(paymentRepository.recordEvent).mockResolvedValue({ duplicate: true });
    vi.mocked(paymentRepository.findById).mockResolvedValue(buildPayment(PaymentStatus.SUCCEEDED));

    const result = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
    });

    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
    expect(transitionOrderStatusUseCase.execute).not.toHaveBeenCalled();
    expect(result.duplicate).toBe(true);
    expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('processes repeated successful callback deliveries once', async () => {
    vi.mocked(paymentRepository.recordEvent)
      .mockResolvedValueOnce({ duplicate: false })
      .mockResolvedValueOnce({ duplicate: true });
    vi.mocked(paymentRepository.findById)
      .mockResolvedValueOnce(buildPayment(PaymentStatus.PENDING))
      .mockResolvedValueOnce(buildPayment(PaymentStatus.SUCCEEDED))
      .mockResolvedValueOnce(buildPayment(PaymentStatus.SUCCEEDED));

    const first = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
    });
    const duplicate = await useCase.execute({
      token: 'token',
      outcome: PaymentSimulatorOutcome.SUCCESS,
    });

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(paymentRepository.updateStatus).toHaveBeenCalledTimes(1);
    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
