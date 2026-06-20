import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Order, OrderStatus } from '../../../ordering/order.module';
import { Payment } from '../../domain/payment.entity';
import {
  PaymentGatewayRequestError,
  PaymentIdempotencyKeyMismatchError,
  PaymentInitiationInProgressError,
  PaymentProviderCircuitOpenError,
  PaymentOrderNotPendingError,
} from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  PaymentCircuitBreakerState,
  type PaymentCircuitBreakerPort,
} from '../../domain/ports/payment-circuit-breaker.port';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import type { PaymentIdempotencyPort } from '../../domain/ports/payment-idempotency.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { InitiatePaymentUseCase } from './initiate-payment.use-case';

function buildOrder(status = OrderStatus.PENDING_PAYMENT): Order {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260619-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    status,
    totalAmountVnd: 2400000,
    createdAt: new Date('2026-06-19T10:00:00.000Z'),
    updatedAt: new Date('2026-06-19T10:00:00.000Z'),
  });
}

function buildPayment(overrides: Partial<ConstructorParameters<typeof Payment>[0]> = {}) {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.SIMULATOR,
    providerTransactionId: 'sim-payment-1',
    status: PaymentStatus.PENDING,
    amountVnd: 2400000,
    redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-19T10:01:00.000Z'),
    updatedAt: new Date('2026-06-19T10:01:00.000Z'),
    completedAt: null,
    ...overrides,
  });
}

describe('InitiatePaymentUseCase', () => {
  let getOrderUseCase: { execute: ReturnType<typeof vi.fn> };
  let paymentRepository: PaymentRepositoryPort;
  let paymentGateway: PaymentGatewayPort;
  let paymentIdempotency: PaymentIdempotencyPort;
  let paymentCircuitBreaker: PaymentCircuitBreakerPort;
  let useCase: InitiatePaymentUseCase;

  beforeEach(() => {
    getOrderUseCase = { execute: vi.fn() };
    paymentRepository = {
      create: vi.fn(async () => buildPayment()),
      findById: vi.fn(),
      findByProviderTransactionId: vi.fn(),
      recordEvent: vi.fn(),
      updateStatus: vi.fn(),
    };
    paymentGateway = {
      createRedirectSession: vi.fn(() => ({
        provider: PaymentProvider.SIMULATOR,
        providerTransactionId: 'sim-payment-1',
        redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
        simulatorToken: 'token',
      })),
      verifySimulatorToken: vi.fn(),
      verifyMomoIpnPayload: vi.fn(),
    };
    paymentIdempotency = {
      claimPaymentInitiation: vi.fn(async () => ({ status: 'CLAIMED' as const })),
      completePaymentInitiation: vi.fn(),
      failPaymentInitiation: vi.fn(),
      releasePaymentInitiation: vi.fn(),
    };
    paymentCircuitBreaker = {
      acquireProviderCall: vi.fn(async ({ provider }: { provider: PaymentProvider }) => ({
        provider,
        state: PaymentCircuitBreakerState.CLOSED as const,
      })),
      recordProviderCallSuccess: vi.fn(),
      recordProviderCallFailure: vi.fn(),
    };
    useCase = new InitiatePaymentUseCase(
      getOrderUseCase as never,
      paymentRepository,
      paymentGateway,
      paymentIdempotency,
      paymentCircuitBreaker,
    );
  });

  it('creates a simulator payment for an owned pending order', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());

    const result = await useCase.execute({
      orderId: 'order-1',
      userId: 'user-1',
      idempotencyKey: 'pay-key-1',
    });

    expect(paymentIdempotency.claimPaymentInitiation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orderId: 'order-1',
        provider: PaymentProvider.SIMULATOR,
        idempotencyKey: 'pay-key-1',
        requestHash: expect.any(String),
      }),
    );
    expect(getOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
    });
    expect(paymentGateway.createRedirectSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        userId: 'user-1',
        provider: PaymentProvider.SIMULATOR,
        amountVnd: 2400000,
      }),
    );
    expect(paymentCircuitBreaker.acquireProviderCall).toHaveBeenCalledWith({
      provider: PaymentProvider.SIMULATOR,
    });
    expect(paymentCircuitBreaker.recordProviderCallSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PaymentProvider.SIMULATOR,
        permit: expect.objectContaining({ state: PaymentCircuitBreakerState.CLOSED }),
      }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        userId: 'user-1',
        provider: PaymentProvider.SIMULATOR,
        providerTransactionId: 'sim-payment-1',
        status: PaymentStatus.PENDING,
        amountVnd: 2400000,
      }),
    );
    expect(paymentIdempotency.completePaymentInitiation).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'pay-key-1',
        response: expect.objectContaining({
          payment: expect.any(Payment),
          redirectUrl: expect.stringContaining('/payment-simulator/redirect'),
        }),
      }),
    );
    expect(result.redirectUrl).toContain('/payment-simulator/redirect');
    expect(result.simulatorToken).toBe('token');
  });

  it('creates a MoMo payment when requested', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());
    vi.mocked(paymentGateway.createRedirectSession).mockResolvedValue({
      provider: PaymentProvider.MOMO,
      providerTransactionId: 'payment-1',
      redirectUrl: 'https://test-payment.momo.vn/pay',
      providerMetadata: {
        payUrl: 'https://test-payment.momo.vn/pay',
        deeplink: 'momo://pay',
      },
    });
    vi.mocked(paymentRepository.create).mockResolvedValue(
      buildPayment({
        provider: PaymentProvider.MOMO,
        providerTransactionId: 'payment-1',
        redirectUrl: 'https://test-payment.momo.vn/pay',
      }),
    );

    const result = await useCase.execute({
      orderId: 'order-1',
      userId: 'user-1',
      idempotencyKey: 'pay-key-1',
      provider: PaymentProvider.MOMO,
    });

    expect(paymentGateway.createRedirectSession).toHaveBeenCalledWith(
      expect.objectContaining({ provider: PaymentProvider.MOMO }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PaymentProvider.MOMO,
        providerTransactionId: 'payment-1',
        redirectUrl: 'https://test-payment.momo.vn/pay',
      }),
    );
    expect(result.providerMetadata).toMatchObject({
      payUrl: 'https://test-payment.momo.vn/pay',
      deeplink: 'momo://pay',
    });
  });

  it('rejects non-pending orders', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.PAID));

    await expect(
      useCase.execute({ orderId: 'order-1', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow(PaymentOrderNotPendingError);

    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(paymentIdempotency.releasePaymentInitiation).toHaveBeenCalled();
    expect(paymentCircuitBreaker.acquireProviderCall).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.recordProviderCallFailure).not.toHaveBeenCalled();
  });

  it('replays completed idempotent payment initiation without calling gateway', async () => {
    const payment = buildPayment({ id: 'payment-replay' });
    vi.mocked(paymentIdempotency.claimPaymentInitiation).mockResolvedValue({
      status: 'REPLAY',
      response: {
        payment,
        redirectUrl: payment.redirectUrl ?? '',
        simulatorToken: 'token',
      },
    });

    const result = await useCase.execute({
      orderId: 'order-1',
      userId: 'user-1',
      idempotencyKey: 'pay-key-1',
    });

    expect(result.payment.id).toBe('payment-replay');
    expect(getOrderUseCase.execute).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.acquireProviderCall).not.toHaveBeenCalled();
    expect(paymentGateway.createRedirectSession).not.toHaveBeenCalled();
    expect(paymentRepository.create).not.toHaveBeenCalled();
  });

  it('rejects same idempotency key with a different request fingerprint', async () => {
    vi.mocked(paymentIdempotency.claimPaymentInitiation).mockResolvedValue({ status: 'MISMATCH' });

    await expect(
      useCase.execute({ orderId: 'order-2', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow(PaymentIdempotencyKeyMismatchError);

    expect(paymentGateway.createRedirectSession).not.toHaveBeenCalled();
    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.acquireProviderCall).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.recordProviderCallFailure).not.toHaveBeenCalled();
  });

  it('rejects duplicate in-progress initiation without calling gateway', async () => {
    vi.mocked(paymentIdempotency.claimPaymentInitiation).mockResolvedValue({
      status: 'IN_PROGRESS',
    });

    await expect(
      useCase.execute({ orderId: 'order-1', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow(PaymentInitiationInProgressError);

    expect(paymentGateway.createRedirectSession).not.toHaveBeenCalled();
    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.acquireProviderCall).not.toHaveBeenCalled();
    expect(paymentCircuitBreaker.recordProviderCallFailure).not.toHaveBeenCalled();
  });

  it('marks the idempotency record failed and records circuit failure when provider initiation fails', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());
    vi.mocked(paymentGateway.createRedirectSession).mockRejectedValue(
      new PaymentGatewayRequestError(PaymentProvider.SIMULATOR, 'provider down'),
    );

    await expect(
      useCase.execute({ orderId: 'order-1', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow(PaymentGatewayRequestError);

    expect(paymentIdempotency.failPaymentInitiation).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'pay-key-1' }),
    );
    expect(paymentCircuitBreaker.recordProviderCallFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: PaymentProvider.SIMULATOR,
        permit: expect.objectContaining({ state: PaymentCircuitBreakerState.CLOSED }),
      }),
    );
  });

  it('does not record circuit failure for non-provider initiation errors', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());
    vi.mocked(paymentGateway.createRedirectSession).mockRejectedValue(new Error('database down'));

    await expect(
      useCase.execute({ orderId: 'order-1', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow('database down');

    expect(paymentIdempotency.failPaymentInitiation).toHaveBeenCalled();
    expect(paymentCircuitBreaker.recordProviderCallFailure).not.toHaveBeenCalled();
  });

  it('blocks new provider calls when the circuit is open', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());
    vi.mocked(paymentCircuitBreaker.acquireProviderCall).mockRejectedValue(
      new PaymentProviderCircuitOpenError(PaymentProvider.SIMULATOR, 30000),
    );

    await expect(
      useCase.execute({ orderId: 'order-1', userId: 'user-1', idempotencyKey: 'pay-key-1' }),
    ).rejects.toThrow(PaymentProviderCircuitOpenError);

    expect(paymentGateway.createRedirectSession).not.toHaveBeenCalled();
    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(paymentIdempotency.releasePaymentInitiation).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'pay-key-1' }),
    );
  });
});
