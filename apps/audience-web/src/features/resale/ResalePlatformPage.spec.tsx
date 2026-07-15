import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResalePlatformPage } from './ResalePlatformPage';

const { useResaleFeed, useToggleUpvote } = vi.hoisted(() => ({
  useResaleFeed: vi.fn(),
  useToggleUpvote: vi.fn(),
}));

vi.mock('../../shared/api/resale', () => ({ useResaleFeed, useToggleUpvote }));
vi.mock('../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ session: { sub: 'buyer-1' } }),
}));

describe('ResalePlatformPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    useToggleUpvote.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('lets the buyer continue their reserved order from the marketplace', () => {
    useResaleFeed.mockReturnValue({
      data: {
        pages: [
          [
            {
              id: 'listing-1',
              sellerId: 'seller-1',
              sellerName: 'Người bán',
              sellerTrustTier: 'NEW',
              concertTitle: 'Live Concert',
              concertSlug: 'live-concert',
              concertStartsAt: '2026-08-15T12:00:00.000Z',
              ticketTypeName: 'VIP',
              askingPriceVnd: 2_800_000,
              originalPriceVnd: 3_000_000,
              upvoteCount: 0,
              commentCount: 0,
              currentOrderId: 'order-1',
              currentOrderStatus: 'RESERVED',
            },
          ],
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(
      <MemoryRouter initialEntries={['/resale']}>
        <ResalePlatformPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Bạn đang giữ vé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute(
      'href',
      '/resale/orders/order-1',
    );
    expect(screen.queryByRole('link', { name: 'Mua ngay' })).not.toBeInTheDocument();
  });
});
