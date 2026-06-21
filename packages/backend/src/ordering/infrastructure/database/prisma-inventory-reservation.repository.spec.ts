import { TicketTypeStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InsufficientTicketInventoryError,
  InventoryReservationConflictError,
  OrderConflictError,
  PerUserTicketLimitExceededError,
  TicketTypeInactiveError,
  TicketTypeSaleWindowError,
} from '../../domain/errors';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import { PrismaInventoryReservationRepository } from './prisma-inventory-reservation.repository';

const now = new Date('2026-06-16T10:00:00.000Z');
const expiresAt = new Date('2026-06-16T10:15:00.000Z');

function buildDomainOrder(
  overrides: Partial<ConstructorParameters<typeof Order>[0]> = {},
): Order {
  return new Order({
    id: 'order-1',
    orderNumber: 'ORD-20260616-ABC123',
    userId: 'user-1',
    concertId: 'concert-1',
    idempotencyKey: 'idem-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmountVnd: 300000,
    reservationExpiresAt: expiresAt,
    createdAt: now,
    updatedAt: now,
    items: [
      new OrderItem({
        id: 'item-1',
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
    reservationExpiresAt: expiresAt,
    paidAt: null,
    expiredAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'item-1',
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

function buildLockedTicketType(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-type-1',
    concertId: 'concert-1',
    priceVnd: 150000,
    totalQuantity: 10,
    reservedQuantity: 3,
    soldQuantity: 4,
    maxPerUser: 10,
    saleStartsAt: new Date('2026-06-01T00:00:00.000Z'),
    saleEndsAt: new Date('2026-06-30T23:59:59.000Z'),
    status: TicketTypeStatus.ACTIVE,
    ...overrides,
  };
}

describe('PrismaInventoryReservationRepository', () => {
  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    order: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    orderItem: {
      groupBy: ReturnType<typeof vi.fn>;
    };
    ticketType: {
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    order: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaInventoryReservationRepository;

  beforeEach(() => {
    tx = {
      $queryRaw: vi.fn(),
      order: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      orderItem: {
        groupBy: vi.fn(),
      },
      ticketType: {
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    prisma = {
      $transaction: vi.fn((callback) => callback(tx)),
      order: {
        findUnique: vi.fn(),
      },
    };
    repository = new PrismaInventoryReservationRepository(prisma as never);
    tx.orderItem.groupBy.mockResolvedValue([]);
  });

  it('locks ticket types, creates order, and increments reserved quantity in one transaction', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType()]);
    tx.order.create.mockResolvedValueOnce(buildPrismaOrder());

    const result = await repository.reserve(buildDomainOrder());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.orderItem.groupBy).toHaveBeenCalledWith({
      by: ['ticketTypeId'],
      where: {
        ticketTypeId: {
          in: ['ticket-type-1'],
        },
        order: {
          userId: 'user-1',
          OR: [
            { status: OrderStatus.PAID },
            {
              status: OrderStatus.PENDING_PAYMENT,
              reservationExpiresAt: {
                gt: now,
              },
            },
          ],
        },
      },
      _sum: {
        quantity: true,
      },
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.orderItem.groupBy.mock.invocationCallOrder[0],
    );
    expect(tx.orderItem.groupBy.mock.invocationCallOrder[0]).toBeLessThan(
      tx.order.create.mock.invocationCallOrder[0],
    );
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'order-1',
          items: {
            create: [
              expect.objectContaining({
                ticketTypeId: 'ticket-type-1',
                quantity: 2,
              }),
            ],
          },
        }),
        include: { items: true },
      }),
    );
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-type-1' },
      data: { reservedQuantity: { increment: 2 } },
    });
    expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('rejects unavailable quantity before creating order or incrementing reservation', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([
      buildLockedTicketType({
        totalQuantity: 5,
        reservedQuantity: 3,
        soldQuantity: 1,
      }),
    ]);

    await expect(repository.reserve(buildDomainOrder())).rejects.toThrow(
      InsufficientTicketInventoryError,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.ticketType.update).not.toHaveBeenCalled();
  });

  it.each([
    [
      buildLockedTicketType({ status: TicketTypeStatus.PAUSED }),
      TicketTypeInactiveError,
    ],
    [
      buildLockedTicketType({ saleStartsAt: new Date('2026-06-17T00:00:00.000Z') }),
      TicketTypeSaleWindowError,
    ],
    [
      buildLockedTicketType({ saleEndsAt: new Date('2026-06-15T00:00:00.000Z') }),
      TicketTypeSaleWindowError,
    ],
  ])(
    'rejects inactive or out-of-window ticket types',
    async (lockedTicketType, expectedError) => {
      tx.order.findUnique.mockResolvedValueOnce(null);
      tx.$queryRaw.mockResolvedValueOnce([lockedTicketType]);

      await expect(repository.reserve(buildDomainOrder())).rejects.toThrow(
        expectedError,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
      expect(tx.ticketType.update).not.toHaveBeenCalled();
    },
  );

  it('rejects when paid quantity plus requested quantity exceeds max per user', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType({ maxPerUser: 2 })]);
    tx.orderItem.groupBy.mockResolvedValueOnce([
      {
        ticketTypeId: 'ticket-type-1',
        _sum: { quantity: 1 },
      },
    ]);

    await expect(repository.reserve(buildDomainOrder())).rejects.toThrow(
      PerUserTicketLimitExceededError,
    );

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.ticketType.update).not.toHaveBeenCalled();
  });

  it('counts active pending reservations toward the max per user limit', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType({ maxPerUser: 3 })]);
    tx.orderItem.groupBy.mockResolvedValueOnce([
      {
        ticketTypeId: 'ticket-type-1',
        _sum: { quantity: 2 },
      },
    ]);

    await expect(repository.reserve(buildDomainOrder())).rejects.toThrow(
      PerUserTicketLimitExceededError,
    );

    expect(tx.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                status: OrderStatus.PENDING_PAYMENT,
                reservationExpiresAt: { gt: now },
              },
            ]),
          }),
        }),
      }),
    );
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.ticketType.update).not.toHaveBeenCalled();
  });

  it('prevents concurrent same-user reservations from bypassing max per user after the row lock', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType({ maxPerUser: 2 })]);
    tx.orderItem.groupBy.mockResolvedValueOnce([
      {
        ticketTypeId: 'ticket-type-1',
        _sum: { quantity: 1 },
      },
    ]);

    await expect(repository.reserve(buildDomainOrder())).rejects.toThrow(
      PerUserTicketLimitExceededError,
    );

    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.orderItem.groupBy.mock.invocationCallOrder[0],
    );
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.ticketType.update).not.toHaveBeenCalled();
  });

  it('does not count expired pending reservations toward the max per user limit', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType({ maxPerUser: 2 })]);
    tx.orderItem.groupBy.mockResolvedValueOnce([]);
    tx.order.create.mockResolvedValueOnce(buildPrismaOrder());

    await expect(repository.reserve(buildDomainOrder())).resolves.toMatchObject({
      id: 'order-1',
      status: OrderStatus.PENDING_PAYMENT,
    });

    expect(tx.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                status: OrderStatus.PENDING_PAYMENT,
                reservationExpiresAt: { gt: now },
              },
            ]),
          }),
        }),
      }),
    );
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.ticketType.update).toHaveBeenCalledTimes(1);
  });

  it('allows checkout when existing quantity plus requested quantity equals max per user', async () => {
    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([buildLockedTicketType({ maxPerUser: 3 })]);
    tx.orderItem.groupBy.mockResolvedValueOnce([
      {
        ticketTypeId: 'ticket-type-1',
        _sum: { quantity: 1 },
      },
    ]);
    tx.order.create.mockResolvedValueOnce(buildPrismaOrder());

    await expect(repository.reserve(buildDomainOrder())).resolves.toMatchObject({
      id: 'order-1',
    });

    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-type-1' },
      data: { reservedQuantity: { increment: 2 } },
    });
  });

  it('evaluates max per user independently for multi-ticket checkout', async () => {
    const order = buildDomainOrder({
      totalAmountVnd: 450000,
      items: [
        new OrderItem({
          id: 'item-1',
          ticketTypeId: 'ticket-type-1',
          quantity: 2,
          unitPriceVnd: 150000,
          totalPriceVnd: 300000,
        }),
        new OrderItem({
          id: 'item-2',
          ticketTypeId: 'ticket-type-2',
          quantity: 1,
          unitPriceVnd: 150000,
          totalPriceVnd: 150000,
        }),
      ],
    });
    const createdOrder = buildPrismaOrder({
      totalAmountVnd: 450000,
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          ticketTypeId: 'ticket-type-1',
          quantity: 2,
          unitPriceVnd: 150000,
          totalPriceVnd: 300000,
        },
        {
          id: 'item-2',
          orderId: 'order-1',
          ticketTypeId: 'ticket-type-2',
          quantity: 1,
          unitPriceVnd: 150000,
          totalPriceVnd: 150000,
        },
      ],
    });

    tx.order.findUnique.mockResolvedValueOnce(null);
    tx.$queryRaw.mockResolvedValueOnce([
      buildLockedTicketType({ id: 'ticket-type-1', maxPerUser: 3 }),
      buildLockedTicketType({ id: 'ticket-type-2', maxPerUser: 1 }),
    ]);
    tx.orderItem.groupBy.mockResolvedValueOnce([
      {
        ticketTypeId: 'ticket-type-1',
        _sum: { quantity: 1 },
      },
    ]);
    tx.order.create.mockResolvedValueOnce(createdOrder);

    const result = await repository.reserve(order);

    expect(result.items).toHaveLength(2);
    expect(tx.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ticketTypeId: {
            in: ['ticket-type-1', 'ticket-type-2'],
          },
        }),
      }),
    );
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-type-1' },
      data: { reservedQuantity: { increment: 2 } },
    });
    expect(tx.ticketType.update).toHaveBeenCalledWith({
      where: { id: 'ticket-type-2' },
      data: { reservedQuantity: { increment: 1 } },
    });
  });

  it('returns an existing idempotent order without reserving again', async () => {
    tx.order.findUnique.mockResolvedValueOnce(buildPrismaOrder());

    const result = await repository.reserve(buildDomainOrder());

    expect(result.id).toBe('order-1');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.orderItem.groupBy).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.ticketType.update).not.toHaveBeenCalled();
  });

  it('confirms paid inventory by moving reserved quantity to sold quantity', async () => {
    tx.order.findUnique
      .mockResolvedValueOnce(buildPrismaOrder())
      .mockResolvedValueOnce(
        buildPrismaOrder({
          status: OrderStatus.PAID,
          paidAt: new Date('2026-06-16T10:30:00.000Z'),
        }),
      );
    tx.order.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.ticketType.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await repository.applyStatusTransition({
      orderId: 'order-1',
      expectedStatus: OrderStatus.PENDING_PAYMENT,
      nextStatus: OrderStatus.PAID,
      updatedAt: new Date('2026-06-16T10:30:00.000Z'),
      paidAt: new Date('2026-06-16T10:30:00.000Z'),
    });

    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: OrderStatus.PENDING_PAYMENT },
      }),
    );
    expect(tx.ticketType.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ticket-type-1',
        reservedQuantity: { gte: 2 },
      },
      data: {
        reservedQuantity: { decrement: 2 },
        soldQuantity: { increment: 2 },
      },
    });
    expect(result.status).toBe(OrderStatus.PAID);
  });

  it('releases expired inventory by decrementing reserved quantity once', async () => {
    const expiredAt = new Date('2026-06-16T10:30:00.000Z');
    tx.order.findUnique
      .mockResolvedValueOnce(buildPrismaOrder())
      .mockResolvedValueOnce(buildPrismaOrder({ status: OrderStatus.EXPIRED, expiredAt }));
    tx.order.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.ticketType.updateMany.mockResolvedValueOnce({ count: 1 });

    await repository.applyStatusTransition({
      orderId: 'order-1',
      expectedStatus: OrderStatus.PENDING_PAYMENT,
      nextStatus: OrderStatus.EXPIRED,
      updatedAt: expiredAt,
      expiredAt,
    });

    expect(tx.ticketType.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ticket-type-1',
        reservedQuantity: { gte: 2 },
      },
      data: {
        reservedQuantity: { decrement: 2 },
      },
    });
  });

  it('rejects repeated or concurrent transitions before inventory counters are changed', async () => {
    tx.order.findUnique.mockResolvedValueOnce(buildPrismaOrder());
    tx.order.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.applyStatusTransition({
        orderId: 'order-1',
        expectedStatus: OrderStatus.PENDING_PAYMENT,
        nextStatus: OrderStatus.EXPIRED,
        updatedAt: new Date('2026-06-16T10:30:00.000Z'),
      }),
    ).rejects.toThrow(OrderConflictError);

    expect(tx.ticketType.updateMany).not.toHaveBeenCalled();
  });

  it('rejects inventory counter conflicts after the status guard succeeds', async () => {
    tx.order.findUnique.mockResolvedValueOnce(buildPrismaOrder());
    tx.order.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.ticketType.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.applyStatusTransition({
        orderId: 'order-1',
        expectedStatus: OrderStatus.PENDING_PAYMENT,
        nextStatus: OrderStatus.EXPIRED,
        updatedAt: new Date('2026-06-16T10:30:00.000Z'),
      }),
    ).rejects.toThrow(InventoryReservationConflictError);
  });
});
