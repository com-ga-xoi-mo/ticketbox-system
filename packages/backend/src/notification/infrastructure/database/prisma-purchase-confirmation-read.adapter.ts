import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  OrderPaidNotificationData,
  PurchaseConfirmationReadPort,
} from '../../domain/ports/purchase-confirmation-read.port';

@Injectable()
export class PrismaPurchaseConfirmationReadAdapter implements PurchaseConfirmationReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOrderPaidNotificationData(
    orderId: string,
  ): Promise<OrderPaidNotificationData | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        concertId: true,
        user: { select: { email: true, displayName: true } },
        concert: { select: { title: true, startsAt: true } },
        _count: { select: { tickets: true } },
      },
    });

    if (!order || order._count.tickets === 0) {
      return null;
    }

    return {
      userId: order.userId,
      userEmail: order.user.email,
      userDisplayName: order.user.displayName,
      concertId: order.concertId,
      concertTitle: order.concert.title,
      startsAt: order.concert.startsAt,
      ticketCount: order._count.tickets,
    };
  }
}
