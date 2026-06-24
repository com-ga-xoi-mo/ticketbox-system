import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EventDetailPage } from './EventDetailPage';
import * as catalogApi from '../../shared/api/catalog';

vi.mock('../../shared/api/catalog', () => ({
  fetchConcertDetail: vi.fn(),
  catalogKeys: {
    detail: vi.fn().mockReturnValue(['detail']),
  },
}));

// QueryClientProvider is needed for useQuery in EventDetailPage
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(initialUrl = '/events/concert-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/events/:slug" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidConcert = {
    id: '1', slug: 'c1', title: 'Concert 1', artistName: 'Artist 1', city: 'HCMC', startsAt: '2026-07-01T00:00:00Z', venueName: 'Venue', 
    availabilitySummary: { totalAvailableQuantity: 10, minPriceVnd: 100 },
    publishedArtistBio: 'Artist Bio Test',
    seatingZones: [
      { id: 'z1', label: 'Zone 1', color: '#ff0000', status: 'ACTIVE', displayOrder: 1 }
    ],
    ticketTypes: [
      { id: 'tt1', code: 'T1', name: 'Ticket 1', priceVnd: 1000, totalQuantity: 10, availableQuantity: 10, maxPerUser: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2030-01-01T00:00:00Z', status: 'ACTIVE', zoneIds: ['z1'] }
    ],
    ticketTypeZoneMappings: [
      { ticketTypeId: 'tt1', seatingZoneId: 'z1' }
    ]
  };

  it('renders artist bio if present', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Artist Bio Test')).toBeInTheDocument();
    });
  });

  it('renders seating zone legend', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Zone 1')).toBeInTheDocument();
      expect(screen.getByText('(10)')).toBeInTheDocument(); // 10 available
    });
  });

  it('handles ticket quantity limits', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Ticket 1')).toBeInTheDocument();
    });

    const increaseBtn = screen.getByLabelText('Tăng số lượng vé Ticket 1');
    const decreaseBtn = screen.getByLabelText('Giảm số lượng vé Ticket 1');

    expect(decreaseBtn).toBeDisabled();

    // Click up to maxPerUser (4)
    await userEvent.click(increaseBtn);
    await userEvent.click(increaseBtn);
    await userEvent.click(increaseBtn);
    await userEvent.click(increaseBtn);
    
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(increaseBtn).toBeDisabled(); // cannot exceed maxPerUser

    await userEvent.click(decreaseBtn);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(increaseBtn).not.toBeDisabled();
  });

  it('renders 404 state when API returns 404', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockRejectedValue({ status: 404 });
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Sự kiện không tồn tại')).toBeInTheDocument();
    });
  });

  it('disables ticket selection when sold out', async () => {
    const soldOutConcert = {
      ...mockValidConcert,
      ticketTypes: [
        { ...mockValidConcert.ticketTypes[0], availableQuantity: 0, status: 'SOLD_OUT' }
      ]
    };
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(soldOutConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Đã hết vé')).toBeInTheDocument(); // Full page sold out banner
      const increaseBtn = screen.getByLabelText('Tăng số lượng vé Ticket 1');
      expect(increaseBtn).toBeDisabled();
    });
  });
});
