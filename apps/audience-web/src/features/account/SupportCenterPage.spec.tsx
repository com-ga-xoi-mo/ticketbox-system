import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportCenterPage } from './SupportCenterPage';

vi.mock('../../shared/auth/AudienceProtectedRoute', () => ({
  AudienceProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../shared/api/support', () => ({
  parseSupportError: (error: unknown) => (error instanceof Error ? error.message : 'Lỗi'),
  useCreateRefundRequest: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useCreateSupportRequest: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useRefundEligibility: () => ({
    isLoading: false,
    data: {
      eligible: true,
      message: 'Eligible for refund request.',
      refundableAmountVnd: 1200000,
    },
  }),
  useRefundRequests: () => ({
    isLoading: false,
    data: [
      {
        id: 'refund-1',
        reason: 'CANNOT_ATTEND',
        status: 'REQUESTED',
        requestedAmountVnd: 1200000,
        updatedAt: '2026-06-25T05:00:00.000Z',
      },
    ],
  }),
  useSupportRequests: () => ({
    isLoading: false,
    data: [
      {
        id: 'support-1',
        category: 'ORDER_HELP',
        status: 'OPEN',
        subject: 'Cần hỗ trợ đơn hàng',
        updatedAt: '2026-06-25T05:00:00.000Z',
      },
    ],
  }),
}));

vi.mock('../../shared/api/downloads', () => ({
  useResendOrderTickets: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useResendTicket: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

describe('SupportCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders account support, refund, resend, and download entry points', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/account/support?orderId=order-1']}>
        <SupportCenterPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hỗ trợ sau mua');
    expect(html).toContain('Tạo yêu cầu hỗ trợ');
    expect(html).toContain('Yêu cầu hoàn tiền');
    expect(html).toContain('Gửi lại email vé');
    expect(html).toContain('Tải bản xác nhận');
  });

  it('surfaces support and refund history links', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/account/support']}>
        <SupportCenterPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Cần hỗ trợ đơn hàng');
    expect(html).toContain('Không thể tham dự');
  });
});
