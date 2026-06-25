import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConcertList } from '../../shared/api/catalog';
import { useOrderDetail } from '../../shared/api/orders';
import { apiPost } from '../../shared/api/client';
import { PaymentResultPage } from './PaymentResultPage';

vi.mock('../../shared/api/catalog', () => ({
  useConcertList: vi.fn(),
}));

vi.mock('../../shared/api/orders', () => ({
  useOrderDetail: vi.fn(),
}));

vi.mock('../../shared/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const failedOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  userId: 'user-1',
  concertId: '11111111-1111-4111-8111-111111111111',
  status: 'FAILED',
  subtotalVnd: 100_000,
  discountAmountVnd: 0,
  serviceFeeVnd: 0,
  totalAmountVnd: 100_000,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
  items: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orders/order-1/result']}>
      <Routes>
        <Route path="/orders/:id/result" element={<PaymentResultPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PaymentResultPage retry navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOrderDetail).mockReturnValue({
      data: failedOrder,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it('returns to the source concert by slug after a failed payment', () => {
    vi.mocked(useConcertList).mockReturnValue({
      data: [
        {
          id: failedOrder.concertId,
          slug: 'dem-nhac-mua-he',
        },
      ],
    } as never);

    renderPage();

    expect(
      screen.getByRole('link', { name: /Thử lại/ }),
    ).toHaveAttribute('href', '/events/dem-nhac-mua-he');
  });

  it('falls back to the event list instead of using a concert UUID as a slug', () => {
    vi.mocked(useConcertList).mockReturnValue({ data: [] } as never);

    renderPage();

    expect(
      screen.getByRole('link', { name: /Thử lại/ }),
    ).toHaveAttribute('href', '/events');
  });

  it('synchronizes a signed MoMo cancellation return with the backend', async () => {
    const refetch = vi.fn();
    vi.mocked(useOrderDetail).mockReturnValue({
      data: { ...failedOrder, status: 'PENDING_PAYMENT' },
      isLoading: false,
      isError: false,
      refetch,
    } as never);
    vi.mocked(useConcertList).mockReturnValue({ data: [] } as never);
    vi.mocked(apiPost).mockResolvedValue({} as never);

    render(
      <MemoryRouter
        initialEntries={[
          '/orders/order-1/result?partnerCode=MOMO_TEST&orderId=payment-1&requestId=payment-1&amount=100000&orderInfo=TicketBox&orderType=momo_wallet&transId=123&resultCode=1006&message=User+canceled&payType=qr&responseTime=1780000000000&extraData=&signature=signed',
        ]}
      >
        <Routes>
          <Route path="/orders/:id/result" element={<PaymentResultPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await vi.waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/payments/momo/ipn',
        expect.objectContaining({
          orderId: 'payment-1',
          amount: 100000,
          resultCode: 1006,
          responseTime: 1780000000000,
          transId: 123,
          signature: 'signed',
        }),
      );
    });
    expect(refetch).toHaveBeenCalled();
  });
});
