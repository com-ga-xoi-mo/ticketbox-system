import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../domain/order-status.enum';
import { PrismaExpiredOrderRepository } from './prisma-expired-order.repository';

describe('PrismaExpiredOrderRepository', () => {
  let prisma: {
    order: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaExpiredOrderRepository;

  beforeEach(() => {
    prisma = {
      order: {
        findMany: vi.fn(),
      },
    };
    repository = new PrismaExpiredOrderRepository(prisma as never);
  });

  it('finds overdue pending orders in expiration order', async () => {
    const now = new Date('2026-06-16T10:30:00.000Z');
    prisma.order.findMany.mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]);

    const result = await repository.findExpiredPendingOrderIds(now, 50);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        reservationExpiresAt: {
          lte: now,
        },
      },
      select: { id: true },
      orderBy: { reservationExpiresAt: 'asc' },
      take: 50,
    });
    expect(result).toEqual(['order-1', 'order-2']);
  });
});
