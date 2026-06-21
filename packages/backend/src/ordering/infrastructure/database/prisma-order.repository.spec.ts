import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderConflictError } from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import { PrismaOrderRepository } from './prisma-order.repository';

const now = new Date('2026-06-16T10:00:00.000Z');
const reservationExpiresAt = new Date('2026-06-16T10:15:00.000Z');

function buildDomainOrder(overrides: Partial<ConstructorParameters<typeof Order>[0]> = {}) {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmountVnd: 300000,
    reservationExpiresAt,
    createdAt: now,
    updatedAt: now,
    items: [
      new OrderItem({
        id: 'order-item-1',
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
        unitPriceVnd: 150000,
        totalPriceVnd: 300000,
      }),
    ],
    ...overrides,
  });
}

function buildPrismaOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmountVnd: 300000,
    reservationExpiresAt,
    paidAt: null,
    expiredAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'order-item-1',
        orderId: 'order-1',
        ticketTypeId: 'ticket-type-1',
        quantity: 2,
        unitPriceVnd: 150000,
        totalPriceVnd: 300000,
      },
    ],
    ...overrides,
  };
}

describe('PrismaOrderRepository', () => {
  let prisma: {
    order: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaOrderRepository;

  beforeEach(() => {
    prisma = {
      order: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    repository = new PrismaOrderRepository(prisma as never);
  });

  it('creates an order with nested order items', async () => {
    prisma.order.create.mockResolvedValue(buildPrismaOrder());

    const result = await repository.create(buildDomainOrder());

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'order-1',
        idempotencyKey: 'idem-1',
        status: OrderStatus.PENDING_PAYMENT,
        items: {
          create: [
            expect.objectContaining({
              id: 'order-item-1',
              ticketTypeId: 'ticket-type-1',
              quantity: 2,
            }),
          ],
        },
      }),
      include: { items: true },
    });
    expect(result).toBeInstanceOf(Order);
    expect(result.items[0]).toBeInstanceOf(OrderItem);
  });

  it('finds an order by id', async () => {
    prisma.order.findUnique.mockResolvedValue(buildPrismaOrder());

    await expect(repository.findById('order-1')).resolves.toMatchObject({
      id: 'order-1',
      orderNumber: 'ORD-20260616-ABC123',
    });
  });

  it('lists orders by user id', async () => {
    prisma.order.findMany.mockResolvedValue([
      buildPrismaOrder({ id: 'order-2' }),
      buildPrismaOrder({ id: 'order-1' }),
    ]);

    const result = await repository.findByUserId('user-1');

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result.map((order) => order.id)).toEqual(['order-2', 'order-1']);
  });

  it('finds an order by user id and idempotency key', async () => {
    prisma.order.findUnique.mockResolvedValue(buildPrismaOrder());

    const result = await repository.findByUserIdAndIdempotencyKey('user-1', 'idem-1');

    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: {
        userId_idempotencyKey: {
          userId: 'user-1',
          idempotencyKey: 'idem-1',
        },
      },
      include: { items: true },
    });
    expect(result?.idempotencyKey).toBe('idem-1');
  });

  it('updates status with optimistic locking', async () => {
    const paidAt = new Date('2026-06-16T10:30:00.000Z');
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUnique.mockResolvedValue(
      buildPrismaOrder({
        status: OrderStatus.PAID,
        paidAt,
        updatedAt: paidAt,
      }),
    );

    const result = await repository.updateStatus({
      orderId: 'order-1',
      expectedStatus: OrderStatus.PENDING_PAYMENT,
      nextStatus: OrderStatus.PAID,
      updatedAt: paidAt,
      paidAt,
    });

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        status: OrderStatus.PENDING_PAYMENT,
      },
      data: expect.objectContaining({
        status: OrderStatus.PAID,
        updatedAt: paidAt,
      }),
    });
    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.updatedAt).toEqual(paidAt);
  });

  it('throws OrderConflictError when optimistic lock does not match', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.updateStatus({
        orderId: 'order-1',
        expectedStatus: OrderStatus.PENDING_PAYMENT,
        nextStatus: OrderStatus.PAID,
        updatedAt: new Date('2026-06-16T10:30:00.000Z'),
      }),
    ).rejects.toThrow(OrderConflictError);
  });
});
