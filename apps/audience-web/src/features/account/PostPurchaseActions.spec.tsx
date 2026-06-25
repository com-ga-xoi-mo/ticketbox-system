import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderDetailPage } from './OrderDetailPage';
import { TicketDetailPage } from './TicketDetailPage';

vi.mock('../../shared/auth/AudienceProtectedRoute', () => ({
  AudienceProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../shared/api/orders', () => ({
  useCancelOrder: () => ({ mutate: vi.fn(), isPending: false }),
  useInitiatePayment: () => ({ mutate: vi.fn(), isPending: false }),
  useOrderDetail: () => ({
    isLoading: false,
    data: {
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: 'PAID',
      createdAt: '2026-06-25T05:00:00.000Z',
      paidAt: '2026-06-25T05:05:00.000Z',
      cancelledAt: null,
      reservationExpiresAt: null,
      totalAmountVnd: 1200000,
      items: [
        {
          id: 'item-1',
          ticketTypeId: 'GA',
          quantity: 1,
          unitPriceVnd: 1200000,
          totalPriceVnd: 1200000,
        },
      ],
    },
  }),
}));

vi.mock('../../shared/api/tickets', () => ({
  useTicketDetail: () => ({
    isLoading: false,
    data: {
      id: 'ticket-1',
      ticketNumber: 'TB-1',
      status: 'ISSUED',
      qrPayload: 'qr-token',
      concertTitle: 'TicketBox Live',
      concertStartsAt: '2026-07-01T12:00:00.000Z',
      ticketTypeName: 'GA',
      ticketTypeCode: 'GA',
      checkedInAt: null,
    },
  }),
}));

vi.mock('../../shared/api/support', () => ({
  parseSupportError: (error: unknown) => (error instanceof Error ? error.message : 'Lỗi'),
  useRefundEligibility: () => ({ data: { eligible: true, message: 'Eligible' } }),
}));

vi.mock('../../shared/api/downloads', () => ({
  useResendOrderTickets: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }),
  useResendTicket: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }),
}));

describe('post-purchase actions', () => {
  it('renders order support, refund, resend, and confirmation actions', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/account/orders/order-1']}>
        <OrderDetailPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hỗ trợ đơn hàng');
    expect(html).toContain('Liên hệ hỗ trợ');
    expect(html).toContain('Yêu cầu hoàn tiền');
    expect(html).toContain('Gửi lại email vé');
    expect(html).toContain('Tải xác nhận mua');
  });

  it('renders ticket support, refund, resend, and download actions', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/account/tickets/ticket-1']}>
        <TicketDetailPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hỗ trợ vé');
    expect(html).toContain('Liên hệ hỗ trợ');
    expect(html).toContain('Yêu cầu hoàn tiền');
    expect(html).toContain('Gửi lại email');
    expect(html).toContain('Tải vé');
  });
});
