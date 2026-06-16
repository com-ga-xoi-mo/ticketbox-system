import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderNotFoundError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import { GetOrderUseCase } from './get-order.use-case';

function buildOrder(userId = 'user-1'): Order {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId,
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
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
    updateStatus: vi.fn(),
  };
}

describe('GetOrderUseCase', () => {
  let orderRepository: IOrderRepository;
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    orderRepository = buildRepository();
    useCase = new GetOrderUseCase(orderRepository);
  });

  it('returns the order for its owner', async () => {
    const order = buildOrder('user-1');
    vi.mocked(orderRepository.findById).mockResolvedValue(order);

    await expect(
      useCase.execute({ userId: 'user-1', orderId: 'order-1' }),
    ).resolves.toBe(order);
  });

  it('throws OrderNotFoundError for a non-owner', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(buildOrder('user-2'));

    await expect(
      useCase.execute({ userId: 'user-1', orderId: 'order-1' }),
    ).rejects.toThrow(OrderNotFoundError);
  });

  it('throws OrderNotFoundError when order does not exist', async () => {
    vi.mocked(orderRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'user-1', orderId: 'missing-order' }),
    ).rejects.toThrow(OrderNotFoundError);
  });
});
