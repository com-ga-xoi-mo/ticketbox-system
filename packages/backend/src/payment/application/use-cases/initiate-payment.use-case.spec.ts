import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Order, OrderStatus } from '../../../ordering/order.module';
import { Payment } from '../../domain/payment.entity';
import { PaymentOrderNotPendingError } from '../../domain/errors';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
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
    provider: 'SIMULATOR',
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
  let useCase: InitiatePaymentUseCase;

  beforeEach(() => {
    getOrderUseCase = { execute: vi.fn() };
    paymentRepository = {
      create: vi.fn(async () => buildPayment()),
      findById: vi.fn(),
      recordEvent: vi.fn(),
      updateStatus: vi.fn(),
    };
    paymentGateway = {
      createRedirectSession: vi.fn(() => ({
        provider: 'SIMULATOR',
        providerTransactionId: 'sim-payment-1',
        redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
        simulatorToken: 'token',
      })),
      verifySimulatorToken: vi.fn(),
    };
    useCase = new InitiatePaymentUseCase(
      getOrderUseCase as never,
      paymentRepository,
      paymentGateway,
    );
  });

  it('creates a simulator payment for an owned pending order', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder());

    const result = await useCase.execute({ orderId: 'order-1', userId: 'user-1' });

    expect(getOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
    });
    expect(paymentGateway.createRedirectSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        userId: 'user-1',
        amountVnd: 2400000,
      }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        userId: 'user-1',
        provider: 'SIMULATOR',
        providerTransactionId: 'sim-payment-1',
        status: PaymentStatus.PENDING,
        amountVnd: 2400000,
      }),
    );
    expect(result.redirectUrl).toContain('/payment-simulator/redirect');
    expect(result.simulatorToken).toBe('token');
  });

  it('rejects non-pending orders', async () => {
    getOrderUseCase.execute.mockResolvedValue(buildOrder(OrderStatus.PAID));

    await expect(useCase.execute({ orderId: 'order-1', userId: 'user-1' })).rejects.toThrow(
      PaymentOrderNotPendingError,
    );

    expect(paymentRepository.create).not.toHaveBeenCalled();
  });
});
