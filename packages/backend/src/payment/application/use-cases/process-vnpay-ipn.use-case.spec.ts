import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../../ordering/order.module';
import type { TransitionOrderStatusUseCase } from '../../../ordering/order.module';
import {
  PaymentCallbackMismatchError,
  PaymentNotFoundError,
  VnpayAmountMismatchError,
} from '../../domain/errors';
import { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  PaymentGatewayPort,
  VerifiedVnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { SuccessfulPaymentFinalizationOutcome } from '../../domain/payment-recovery';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';
import { ProcessVnpayIpnUseCase } from './process-vnpay-ipn.use-case';

function buildPayment(status = PaymentStatus.PENDING): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.VNPAY,
    providerTransactionId: 'payment-1',
    status,
    amountVnd: 1200000,
    redirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-24T03:00:00.000Z'),
    updatedAt: new Date('2026-06-24T03:00:00.000Z'),
    completedAt: null,
  });
}

function verified(
  overrides: Partial<VerifiedVnpayCallbackPayload> = {},
): VerifiedVnpayCallbackPayload {
  return {
    payload: {},
    providerTransactionId: 'payment-1',
    providerEventId: 'vnpay:payment-1:123456:00:00:20260624100200',
    providerPaymentId: '123456',
    amountVnd: 1200000,
    responseCode: '00',
    transactionStatus: '00',
    success: true,
    failureCode: null,
    failureMessage: null,
    ...overrides,
  };
}

describe('ProcessVnpayIpnUseCase', () => {
  let paymentRepository: PaymentRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let transitionOrderStatusUseCase: { execute: ReturnType<typeof vi.fn> };
  let finalizeSuccessfulPaymentUseCase: { execute: ReturnType<typeof vi.fn> };
  let useCase: ProcessVnpayIpnUseCase;

  beforeEach(() => {
    paymentRepository = {
      create: vi.fn(),
      findById: vi.fn(async () => buildPayment()),
      findByProviderTransactionId: vi.fn(async () => buildPayment()),
      recordEvent: vi.fn(async () => ({ duplicate: false })),
      updateStatus: vi.fn(async ({ status, failureCode, failureMessage, completedAt }) => {
        const payment = buildPayment(status);
        return new Payment({
          ...payment,
          failureCode: failureCode ?? null,
          failureMessage: failureMessage ?? null,
          completedAt: completedAt ?? null,
        });
      }),
    };
    paymentGateway = {
      createRedirectSession: vi.fn(),
      verifySimulatorToken: vi.fn(),
      verifyMomoIpnPayload: vi.fn(),
      verifyVnpayCallbackPayload: vi.fn(() => verified()),
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
    useCase = new ProcessVnpayIpnUseCase(
      paymentRepository,
      paymentGateway,
      finalizeSuccessfulPaymentUseCase as unknown as FinalizeSuccessfulPaymentUseCase,
      transitionOrderStatusUseCase as unknown as TransitionOrderStatusUseCase,
    );
  });

  it('marks a successful VNPay IPN paid and transitions the order once', async () => {
    const result = await useCase.execute({});

    expect(paymentRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: PaymentEventType.CALLBACK_RECEIVED,
        providerEventId: 'vnpay:payment-1:123456:00:00:20260624100200',
        providerTransactionId: '123456',
      }),
    );
    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
    );
    expect(finalizeSuccessfulPaymentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'payment-1' }),
    );
    expect(result.orderTransitioned).toBe(true);
  });

  it('maps a failed VNPay IPN to failed payment and order', async () => {
    vi.mocked(paymentGateway.verifyVnpayCallbackPayload).mockReturnValue(
      verified({
        responseCode: '24',
        transactionStatus: '02',
        success: false,
        failureCode: '24',
        failureMessage: 'Customer cancelled',
      }),
    );

    const result = await useCase.execute({});

    expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.FAILED,
        failureCode: '24',
        failureMessage: 'Customer cancelled',
      }),
    );
    expect(transitionOrderStatusUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.FAILED }),
    );
    expect(result.payment.status).toBe(PaymentStatus.FAILED);
  });

  it('rejects an amount mismatch before recording the callback', async () => {
    vi.mocked(paymentGateway.verifyVnpayCallbackPayload).mockReturnValue(
      verified({ amountVnd: 1000 }),
    );

    await expect(useCase.execute({})).rejects.toThrow(VnpayAmountMismatchError);
    expect(paymentRepository.recordEvent).not.toHaveBeenCalled();
    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects an unknown VNPay payment before recording the callback', async () => {
    vi.mocked(paymentRepository.findByProviderTransactionId).mockResolvedValue(null);

    await expect(useCase.execute({})).rejects.toThrow(PaymentNotFoundError);
    expect(paymentRepository.recordEvent).not.toHaveBeenCalled();
  });

  it('rejects a callback that resolves to another provider', async () => {
    vi.mocked(paymentRepository.findByProviderTransactionId).mockResolvedValue(
      new Payment({
        ...buildPayment(),
        provider: PaymentProvider.MOMO,
      }),
    );

    await expect(useCase.execute({})).rejects.toThrow(PaymentCallbackMismatchError);
    expect(paymentRepository.recordEvent).not.toHaveBeenCalled();
  });

  it('treats duplicate success callback as a no-op', async () => {
    vi.mocked(paymentRepository.recordEvent).mockResolvedValue({ duplicate: true });
    vi.mocked(paymentRepository.findById).mockResolvedValue(buildPayment(PaymentStatus.SUCCEEDED));

    const result = await useCase.execute({});

    expect(paymentRepository.updateStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulPaymentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'payment-1' }),
    );
    expect(result.duplicate).toBe(true);
  });
});
