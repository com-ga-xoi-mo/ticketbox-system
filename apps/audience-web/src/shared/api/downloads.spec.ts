import { describe, expect, it, vi } from 'vitest';
import {
  fetchOrderConfirmation,
  fetchTicketDownload,
  resendOrderTickets,
  resendTicket,
} from './downloads';
import { apiGet, apiPost } from './client';

vi.mock('./client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const timestamp = '2026-06-25T05:00:00.000Z';

describe('download and resend API', () => {
  it('resends order and ticket emails', async () => {
    vi.mocked(apiPost).mockResolvedValue({ status: 'QUEUED', notificationId: 'n1', cooldownUntil: null, message: 'Queued' });

    await expect(resendOrderTickets('order-1')).resolves.toMatchObject({ status: 'QUEUED' });
    expect(apiPost).toHaveBeenCalledWith('/me/orders/order-1/resend-tickets', {});

    await expect(resendTicket('ticket-1')).resolves.toMatchObject({ status: 'QUEUED' });
    expect(apiPost).toHaveBeenCalledWith('/me/tickets/ticket-1/resend', {});
  });

  it('fetches printable ticket and order confirmation contracts', async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
        label: 'Ticket',
        ticket: {
          id: 'ticket-1',
          ticketNumber: 'TB-1',
          status: 'ISSUED',
          ticketTypeName: 'GA',
          ticketTypeCode: 'GA',
          issuedAt: timestamp,
          qrPayload: 'qr-token',
        },
        order: { id: 'order-1', orderNumber: 'ORD-1', status: 'PAID' },
        concert: { id: 'concert-1', title: 'TicketBox Live', venueName: 'Arena', startsAt: timestamp },
        generatedAt: timestamp,
      })
      .mockResolvedValueOnce({
        label: 'Purchase confirmation',
        order: {
          id: 'order-1',
          orderNumber: 'ORD-1',
          status: 'PAID',
          totalAmountVnd: 1200000,
          paidAt: timestamp,
          createdAt: timestamp,
        },
        concert: { id: 'concert-1', title: 'TicketBox Live', venueName: 'Arena', startsAt: timestamp },
        lineItems: [
          {
            ticketTypeId: 'type-1',
            ticketTypeName: 'GA',
            quantity: 1,
            unitPriceVnd: 1200000,
            totalPriceVnd: 1200000,
          },
        ],
        payment: { provider: 'SIMULATOR', completedAt: timestamp },
        generatedAt: timestamp,
      });

    await expect(fetchTicketDownload('ticket-1')).resolves.toMatchObject({ label: 'Ticket' });
    expect(apiGet).toHaveBeenCalledWith('/me/tickets/ticket-1/download');

    await expect(fetchOrderConfirmation('order-1')).resolves.toMatchObject({
      label: 'Purchase confirmation',
    });
    expect(apiGet).toHaveBeenCalledWith('/me/orders/order-1/confirmation');
  });
});
