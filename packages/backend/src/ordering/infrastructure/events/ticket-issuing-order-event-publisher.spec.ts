import { describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../domain/order-status.enum';
import { TicketIssuingOrderEventPublisher } from './ticket-issuing-order-event-publisher';

describe('TicketIssuingOrderEventPublisher', () => {
  it('issues tickets for OrderPaid events', async () => {
    const issueTicketsForPaidOrderUseCase = { execute: vi.fn() };
    const publisher = new TicketIssuingOrderEventPublisher(
      issueTicketsForPaidOrderUseCase as never,
    );
    const paidAt = new Date('2026-06-16T10:30:00.000Z');

    await publisher.publishAll([
      {
        type: 'OrderPaid',
        orderId: 'order-1',
        previousStatus: OrderStatus.PENDING_PAYMENT,
        newStatus: OrderStatus.PAID,
        paidAt,
        occurredAt: paidAt,
      },
    ]);

    expect(issueTicketsForPaidOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: 'order-1',
      issuedAt: paidAt,
    });
  });

  it('ignores non-paid order events', async () => {
    const issueTicketsForPaidOrderUseCase = { execute: vi.fn() };
    const publisher = new TicketIssuingOrderEventPublisher(
      issueTicketsForPaidOrderUseCase as never,
    );

    await publisher.publishAll([
      {
        type: 'OrderExpired',
        orderId: 'order-1',
        previousStatus: OrderStatus.PENDING_PAYMENT,
        newStatus: OrderStatus.EXPIRED,
        expiredAt: new Date('2026-06-16T10:30:00.000Z'),
        occurredAt: new Date('2026-06-16T10:30:00.000Z'),
      },
    ]);

    expect(issueTicketsForPaidOrderUseCase.execute).not.toHaveBeenCalled();
  });
});
