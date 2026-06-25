import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import { OrderStatus } from '../../domain/order-status.enum';
import type { IExpiredOrderRepository } from '../../domain/ports/expired-order-repository.port';

@Injectable()
export class PrismaExpiredOrderRepository implements IExpiredOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findExpiredPendingOrderIds(now: Date, limit: number): Promise<string[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        reservationExpiresAt: {
          lte: now,
        },
        payments: {
          none: {
            status: 'SUCCEEDED',
          },
        },
      },
      select: { id: true },
      orderBy: { reservationExpiresAt: 'asc' },
      take: limit,
    });

    return orders.map((order) => order.id);
  }
}
