import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IOrderRepository } from '../../domain/ports/order-repository.port';
import { ListUserOrdersUseCase } from './list-user-orders.use-case';

function buildOrder(id: string): Order {
  return new Order({
    id,
    orderNumber: `ORD-20260616-${id.toUpperCase().padEnd(6, '0').slice(0, 6)}`,
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: `idem-${id}`,
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

describe('ListUserOrdersUseCase', () => {
  let orderRepository: IOrderRepository;
  let useCase: ListUserOrdersUseCase;

  beforeEach(() => {
    orderRepository = buildRepository();
    useCase = new ListUserOrdersUseCase(orderRepository);
  });

  it('returns orders for the authenticated user', async () => {
    const orders = [buildOrder('order-1'), buildOrder('order-2')];
    vi.mocked(orderRepository.findByUserId).mockResolvedValue(orders);

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual(orders);
    expect(orderRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns an empty list when the user has no orders', async () => {
    vi.mocked(orderRepository.findByUserId).mockResolvedValue([]);

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual([]);
  });
});
