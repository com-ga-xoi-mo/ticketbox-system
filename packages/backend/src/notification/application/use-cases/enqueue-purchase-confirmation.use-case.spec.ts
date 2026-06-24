import { describe, expect, it, vi } from 'vitest';

import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';
import type { OrderPaidNotificationData } from '../../domain/ports/purchase-confirmation-read.port';
import { EnqueuePurchaseConfirmationUseCase } from './enqueue-purchase-confirmation.use-case';

const data: OrderPaidNotificationData = {
  userId: 'user-1',
  userEmail: 'buyer@ticketbox.test',
  userDisplayName: 'Buyer One',
  concertId: 'concert-1',
  concertTitle: 'TicketBox Live',
  startsAt: new Date('2026-07-01T12:00:00.000Z'),
  ticketCount: 2,
};

describe('EnqueuePurchaseConfirmationUseCase', () => {
  it('assembles and enqueues a confirmation for a paid order', async () => {
    const readPort = { findOrderPaidNotificationData: vi.fn(async () => data) };
    const queue = {
      enqueueOrderPaid: vi.fn(async (_event: OrderPaidForNotification) => undefined),
    };
    const useCase = new EnqueuePurchaseConfirmationUseCase(
      readPort,
      queue,
      'http://localhost:5173/',
    );
    const paidAt = new Date('2026-06-23T08:00:00.000Z');

    await useCase.execute('order-1', paidAt);

    expect(readPort.findOrderPaidNotificationData).toHaveBeenCalledWith('order-1');
    expect(queue.enqueueOrderPaid).toHaveBeenCalledWith({
      eventId: 'order-1',
      orderId: 'order-1',
      userId: 'user-1',
      userEmail: 'buyer@ticketbox.test',
      userDisplayName: 'Buyer One',
      concertId: 'concert-1',
      concertTitle: 'TicketBox Live',
      startsAt: '2026-07-01T12:00:00.000Z',
      ticketCount: 2,
      ticketAccessUrl: 'http://localhost:5173/orders/order-1/tickets',
      paidAt: '2026-06-23T08:00:00.000Z',
    });
    const queuedPayload = JSON.stringify(queue.enqueueOrderPaid.mock.calls[0][0]);
    expect(queuedPayload).not.toContain('qrPayload');
    expect(queuedPayload).not.toContain('image/png');
    expect(queuedPayload).not.toContain('QR_TOKEN_SECRET');
  });

  it('is a no-op when the order has no confirmation data', async () => {
    const readPort = { findOrderPaidNotificationData: vi.fn(async () => null) };
    const queue = { enqueueOrderPaid: vi.fn(async () => undefined) };
    const useCase = new EnqueuePurchaseConfirmationUseCase(
      readPort,
      queue,
      'http://localhost:5173',
    );

    await useCase.execute('missing-order', new Date());

    expect(queue.enqueueOrderPaid).not.toHaveBeenCalled();
  });
});
