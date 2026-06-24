import { describe, expect, it, vi } from 'vitest';

import { OrderStatus } from '../../domain/order-status.enum';
import { TicketIssuingOrderEventPublisher } from './ticket-issuing-order-event-publisher';

describe('TicketIssuingOrderEventPublisher', () => {
  it('issues tickets and enqueues a purchase confirmation for OrderPaid events', async () => {
    const issueTicketsForPaidOrderUseCase = { execute: vi.fn() };
    const orderPaidNotifier = { notifyOrderPaid: vi.fn() };
    const publisher = new TicketIssuingOrderEventPublisher(
      issueTicketsForPaidOrderUseCase as never,
      orderPaidNotifier as never,
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
    expect(orderPaidNotifier.notifyOrderPaid).toHaveBeenCalledWith('order-1', paidAt);
  });

  it('ignores non-paid order events', async () => {
    const issueTicketsForPaidOrderUseCase = { execute: vi.fn() };
    const orderPaidNotifier = { notifyOrderPaid: vi.fn() };
    const publisher = new TicketIssuingOrderEventPublisher(
      issueTicketsForPaidOrderUseCase as never,
      orderPaidNotifier as never,
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
    expect(orderPaidNotifier.notifyOrderPaid).not.toHaveBeenCalled();
  });

  it('does not roll back the paid order when the confirmation enqueue fails', async () => {
    const issueTicketsForPaidOrderUseCase = { execute: vi.fn() };
    const orderPaidNotifier = {
      notifyOrderPaid: vi.fn().mockRejectedValue(new Error('queue down')),
    };
    const publisher = new TicketIssuingOrderEventPublisher(
      issueTicketsForPaidOrderUseCase as never,
      orderPaidNotifier as never,
    );
    const paidAt = new Date('2026-06-16T10:30:00.000Z');

    await expect(
      publisher.publishAll([
        {
          type: 'OrderPaid',
          orderId: 'order-1',
          previousStatus: OrderStatus.PENDING_PAYMENT,
          newStatus: OrderStatus.PAID,
          paidAt,
          occurredAt: paidAt,
        },
      ]),
    ).resolves.toBeUndefined();

    expect(issueTicketsForPaidOrderUseCase.execute).toHaveBeenCalledOnce();
  });
});
