import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InvalidOrderTransitionError,
  OrderAccessDeniedError,
  OrderConflictError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import { TransitionOrderStatusUseCase } from './transition-order-status.use-case';

function buildOrder(status = OrderStatus.PENDING_PAYMENT, userId = 'user-1'): Order {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId,
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status,
    totalAmountVnd: 150000,
    createdAt: new Date('2026-06-16T10:00:00.000Z'),
    updatedAt: new Date('2026-06-16T10:00:00.000Z'),
  });
}

function buildRepository(): IOrderRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdAndIdempotencyKey: vi.fn(),
    updateStatus: vi.fn(async ({ nextStatus }) => buildOrder(nextStatus)),
  };
}

function buildEventPublisher(): IOrderEventPublisher {
  return {
    publishAll: vi.fn(),
  };
}

describe('TransitionOrderStatusUseCase', () => {
  let orderRepository: IOrderRepository;
  let eventPublisher: IOrderEventPublisher;
  let useCase: TransitionOrderStatusUseCase;
  const occurredAt = new Date('2026-06-16T10:30:00.000Z');

  beforeEach(() => {
    orderRepository = buildRepository();
    eventPublisher = buildEventPublisher();
    useCase = new TransitionOrderStatusUseCase(orderRepository, eventPublisher);
  });

  it.each([
    [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, 'OrderPaid'],
    [OrderStatus.PENDING_PAYMENT, OrderStatus.EXPIRED, 'OrderExpired'],
    [OrderStatus.PENDING_PAYMENT, OrderStatus.FAILED, 'OrderFailed'],
    [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, 'OrderCancelled'],
    [OrderStatus.PAID, OrderStatus.REFUNDED, 'OrderRefunded'],
  ])(
    'persists and publishes valid transition %s -> %s',
    async (currentStatus, nextStatus, eventType) => {
      const order = buildOrder(currentStatus);
      vi.mocked(orderRepository.findById).mockResolvedValue(order);

      const result = await useCase.execute({
        userId: 'user-1',
        orderId: 'order-1',
        status: nextStatus,
        occurredAt,
      });

      expect(result.status).toBe(nextStatus);
      expect(orderRepository.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          expectedStatus: currentStatus,
          nextStatus,
        }),
      );
      expect(eventPublisher.publishAll).toHaveBeenCalledWith([
        expect.objectContaining({ type: eventType, orderId: 'order-1' }),
      ]);
      expect(order.domainEvents).toEqual([]);
    },
  );

  it('rejects invalid transitions before persistence', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(buildOrder(OrderStatus.EXPIRED));

    await expect(
      useCase.execute({
        userId: 'user-1',
        orderId: 'order-1',
        status: OrderStatus.PAID,
        occurredAt,
      }),
    ).rejects.toThrow(InvalidOrderTransitionError);

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    expect(eventPublisher.publishAll).not.toHaveBeenCalled();
  });

  it('rejects a non-owner', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(
      buildOrder(OrderStatus.PENDING_PAYMENT, 'user-2'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        orderId: 'order-1',
        status: OrderStatus.CANCELLED,
      }),
    ).rejects.toThrow(OrderAccessDeniedError);
  });

  it('publishes domain events on successful transition', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(buildOrder());

    await useCase.execute({
      userId: 'user-1',
      orderId: 'order-1',
      status: OrderStatus.PAID,
      occurredAt,
    });

    expect(eventPublisher.publishAll).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'OrderPaid',
        paidAt: occurredAt,
        occurredAt,
      }),
    ]);
  });

  it('propagates optimistic lock conflicts from the repository', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(buildOrder());
    vi.mocked(orderRepository.updateStatus).mockRejectedValue(
      new OrderConflictError('order-1'),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        orderId: 'order-1',
        status: OrderStatus.PAID,
      }),
    ).rejects.toThrow(OrderConflictError);

    expect(eventPublisher.publishAll).not.toHaveBeenCalled();
  });
});
