import { describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../../ordering/domain/order-status.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import { PrismaPaymentRecoveryRepository } from './prisma-payment-recovery.repository';

describe('PrismaPaymentRecoveryRepository', () => {
  it('loads successful payment fulfillment state', async () => {
    const prisma = {
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'payment-1',
          orderId: 'order-1',
          status: PaymentStatus.SUCCEEDED,
          completedAt: new Date('2026-06-24T07:00:00.000Z'),
          order: {
            status: OrderStatus.PAID,
            items: [{ quantity: 2 }, { quantity: 1 }],
            tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
          },
        }),
      },
      $queryRaw: vi.fn(),
    };
    const repository = new PrismaPaymentRecoveryRepository(prisma as never);

    await expect(repository.findState('payment-1')).resolves.toMatchObject({
      paymentId: 'payment-1',
      orderId: 'order-1',
      orderStatus: OrderStatus.PAID,
      expectedTicketCount: 3,
      existingTicketCount: 2,
    });
  });

  it('returns deterministic bounded candidate ids from the recovery query', async () => {
    const prisma = {
      payment: { findUnique: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([
        { id: 'payment-1' },
        { id: 'payment-2' },
      ]),
    };
    const repository = new PrismaPaymentRecoveryRepository(prisma as never);

    await expect(repository.findCandidatePaymentIds(50)).resolves.toEqual([
      'payment-1',
      'payment-2',
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});
