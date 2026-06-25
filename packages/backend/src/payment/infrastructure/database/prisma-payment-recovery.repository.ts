import { Injectable } from '@nestjs/common';
import { PaymentStatus as PrismaPaymentStatus, Prisma } from '@prisma/client';

import { OrderStatus } from '../../../ordering/domain/order-status.enum';
import { PrismaService } from '../../../platform/database/prisma.service';
import type { SuccessfulPaymentRecoveryState } from '../../domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from '../../domain/ports/payment-recovery-repository.port';

@Injectable()
export class PrismaPaymentRecoveryRepository implements PaymentRecoveryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findState(paymentId: string): Promise<SuccessfulPaymentRecoveryState | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: { select: { quantity: true } },
            tickets: { select: { id: true } },
          },
        },
      },
    });

    if (!payment || payment.status !== PrismaPaymentStatus.SUCCEEDED) {
      return null;
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      paymentCompletedAt: payment.completedAt,
      orderStatus: payment.order.status as OrderStatus,
      expectedTicketCount: payment.order.items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      existingTicketCount: payment.order.tickets.length,
    };
  }

  async findCandidatePaymentIds(limit: number): Promise<string[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 500));
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.status = 'SUCCEEDED'
        AND (
          o.status <> 'PAID'
          OR (
            o.status = 'PAID'
            AND (
              SELECT COUNT(*)::int
              FROM tickets t
              WHERE t.order_id = o.id
            ) < (
              SELECT COALESCE(SUM(oi.quantity), 0)::int
              FROM order_items oi
              WHERE oi.order_id = o.id
            )
          )
        )
      ORDER BY p.completed_at ASC NULLS FIRST, p.id ASC
      LIMIT ${boundedLimit}
    `);

    return rows.map((row) => row.id);
  }
}
