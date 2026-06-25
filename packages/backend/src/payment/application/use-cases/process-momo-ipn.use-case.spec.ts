import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../../ordering/order.module';
import type { TransitionOrderStatusUseCase } from '../../../ordering/order.module';
import { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  MomoIpnPayload,
  PaymentGatewayPort,
  VerifiedMomoIpnPayload,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { SuccessfulPaymentFinalizationOutcome } from '../../domain/payment-recovery';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';
import { ProcessMomoIpnUseCase } from './process-momo-ipn.use-case';

function buildPayment(status = PaymentStatus.PENDING): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.MOMO,
    providerTransactionId: 'payment-1',
    status,
    amountVnd: 2400000,
    redirectUrl: 'https://test-payment.momo.vn/pay',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-19T10:01:00.000Z'),
    updatedAt: new Date('2026-06-19T10:01:00.000Z'),
    completedAt: null,
  });
}

function buildMomoPayload(overrides: Partial<VerifiedMomoIpnPayload> = {}): VerifiedMomoIpnPayload {
  return {
    partnerCode: 'MOMOUDLU20220629',
    orderId: 'payment-1',
    requestId: 'payment-1',
    amount: 2400000,
    resultCode: 0,
    message: 'Successful.',
    responseTime: 1780000000000,
    signature: 'signature',
    providerTransactionId: 'payment-1',
    providerEventId: 'momo:payment-1:payment-1:123:0',
    success: true,
    failureCode: null,
    failureMessage: null,
    ...overrides,
  };
}

describe('ProcessMomoIpnUseCase', () => {
  let paymentRepository: PaymentRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let transitionOrderStatusUseCase: { execute: ReturnType<typeof vi.fn> };
  let finalizeSuccessfulPaymentUseCase: { execute: ReturnType<typeof vi.fn> };
  let useCase: ProcessMomoIpnUseCase;

  beforeEach(() => {
    paymentRepository = {
      create: vi.fn(),
      findById: vi.fn(async () => buildPayment()),
      findByProviderTransactionId: vi.fn(async () => buildPayment()),
      recordEvent: vi.fn(async () => ({ duplicate: false })),
      updateStatus: vi.fn(async ({ status, failureCode, failureMessage, completedAt }) => {
        const payment = buildPayment(status);
        return new Payment({
          id: payment.id,
          orderId: payment.orderId,
          userId: payment.userId,
          provider: payment.provider,
          providerTransactionId: payment.providerTransactionId,
          status: payment.status,
          amountVnd: payment.amountVnd,
          redirectUrl: payment.redirectUrl,
          failureCode: failureCode ?? null,
          failureMessage: failureMessage ?? null,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          completedAt: completedAt ?? null,
        });
      }),
    };
    paymentGateway = {
      createRedirectSession: vi.fn(),
      verifySimulatorToken: vi.fn(),
      verifyMomoIpnPayload: vi.fn(() => buildMomoPayload()),
      verifyVnpayCallbackPayload: vi.fn(),
    };
    transitionOrderStatusUseCase = { execute: vi.fn(async () => undefined) };
    finalizeSuccessfulPaymentUseCase = {
      execute: vi.fn(async () => ({
        paymentId: 'payment-1',
        orderId: 'order-1',
        outcome: SuccessfulPaymentFinalizationOutcome.COMPLETED,
        orderTransitioned: true,
        ticketsComplete: true,
      })),
    };
    useCase = new ProcessMomoIpnUseCase(
      paymentRepository,
      paymentGateway,
      finalizeSuccessfulPaymentUseCase as unknown as FinalizeSuccessfulPaymentUseCase,
      transitionOrderStatusUseCase as unknown as TransitionOrderStatusUseCase,
    );
  });

  it('marks successful MoMo IPN as paid and transitions the order', async () => {
    const result = await useCase.execute({
      payload: buildMomoPayload() as MomoIpnPayload,
      occurredAt: new Date('2026-06-19T10:05:00.000Z'),
    });

    expect(paymentGateway.verifyMomoIpnPayload).toHaveBeenCalled();
    expect(paymentRepository.findByProviderTransactionId).toHaveBeenCalledWith('payment-1');
    expect(paymentRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: PaymentEventType.CALLBACK_RECEIVED,
        providerEventId: 'momo:payment-1:payment-1:123:0',
        providerTransactionId: 'payment-1',
      }),
    );
    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
    );
    expect(finalizeSuccessfulPaymentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
      }),
    );
    expect(result.duplicate).toBe(false);
    expect(result.orderTransitioned).toBe(true);
  });

  it('marks failed MoMo IPN as failed without issuing tickets', async () => {
    vi.mocked(paymentGateway.verifyMomoIpnPayload).mockReturnValue(
      buildMomoPayload({
        resultCode: 1006,
        success: false,
        failureCode: '1006',
        failureMessage: 'Transaction failed.',
        providerEventId: 'momo:payment-1:payment-1:123:1006',
      }),
    );

    const result = await useCase.execute({ payload: buildMomoPayload() as MomoIpnPayload });

    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.FAILED,
        failureCode: '1006',
        failureMessage: 'Transaction failed.',
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

  it('ignores duplicate MoMo IPN callbacks and does not transition the order again', async () => {
    vi.mocked(paymentRepository.recordEvent).mockResolvedValue({ duplicate: true });
    vi.mocked(paymentRepository.findById).mockResolvedValue(buildPayment(PaymentStatus.SUCCEEDED));

    const result = await useCase.execute({ payload: buildMomoPayload() as MomoIpnPayload });

    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulPaymentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'payment-1' }),
    );
    expect(result.duplicate).toBe(true);
    expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
  });
});
