import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { EventDetailPage } from './EventDetailPage';
import * as catalogApi from '../../shared/api/catalog';
import * as lotteryApi from '../../shared/api/lottery';
import { AuthProvider } from '../../shared/auth/AuthContext';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('../../shared/api/catalog', () => ({
  fetchConcertDetail: vi.fn(),
  catalogKeys: {
    detail: vi.fn().mockReturnValue(['detail']),
  },
}));

vi.mock('../../shared/api/lottery', () => ({
  fetchLotteryConfig: vi.fn(),
  fetchLotteryRegistrations: vi.fn(),
  fetchLotteryStatus: vi.fn(),
  registerForLottery: vi.fn(),
  runLotteryDrawNow: vi.fn(),
  updateLotteryTtl: vi.fn(),
  withdrawFromLottery: vi.fn(),
  lotteryKeys: {
    all: ['lottery'],
    status: (ticketTypeId: string) => ['lottery', 'status', ticketTypeId],
    registrations: (ticketTypeId: string) => ['lottery', 'registrations', ticketTypeId],
    config: (ticketTypeId: string) => ['lottery', 'config', ticketTypeId],
  },
}));

vi.mock('./components/SeatingZoneMap', () => ({
  SeatingZoneMap: (props: any) => (
    <div
      data-testid="seating-zone-map"
      data-active-tt={props.activeTicketTypeId ?? ''}
      data-selected-zone={props.selectedZoneId ?? ''}
    >
      <button onClick={() => props.onLoadError()}>trigger-error</button>
    </div>
  ),
}));

// QueryClientProvider is needed for useQuery in EventDetailPage
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function CheckoutProbe() {
  const location = useLocation();
  return <div data-testid="checkout-state">{JSON.stringify(location.state)}</div>;
}

function renderWithProviders(initialUrl = '/events/concert-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialUrl]}>
          <Routes>
            <Route path="/events/:slug" element={<EventDetailPage />} />
            <Route path="/checkout" element={<CheckoutProbe />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

function makeToken(roles: string[]) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'user-1', roles })}.sig`;
}

function renderWithAuthProviders(initialUrl = '/events/concert-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialUrl]}>
            <Routes>
              <Route path="/events/:slug" element={<EventDetailPage />} />
              <Route path="/checkout" element={<CheckoutProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

describe('EventDetailPage lottery operator controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const lotteryConcert = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'c1',
    title: 'Concert 1',
    artistName: 'Artist 1',
    city: 'HCMC',
    startsAt: '2026-07-01T00:00:00Z',
    venueName: 'Venue',
    eventType: 'CONCERT',
    availabilitySummary: { totalAvailableQuantity: 10, minPriceVnd: 100 },
    seatingMapAsset: null,
    seatingZones: [],
    ticketTypeZoneMappings: [],
    ticketTypes: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'T1',
        name: 'Ticket 1',
        priceVnd: 1000,
        totalQuantity: 10,
        availableQuantity: 10,
        maxPerUser: 4,
        saleStartsAt: '2020-01-01T00:00:00Z',
        saleEndsAt: '2030-01-01T00:00:00Z',
        status: 'ACTIVE',
        zoneIds: [],
      },
    ],
  };

  it('shows organizer controls and renders registration list', async () => {
    localStorage.setItem('ticketbox_audience_token', makeToken(['ORGANIZER']));
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(lotteryConcert as any);
    vi.mocked(lotteryApi.fetchLotteryStatus).mockResolvedValue({
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
      registrationId: null,
      registrationStatus: null,
      desiredQuantity: null,
      configStatus: 'SCHEDULED',
      registrationOpensAt: '2026-01-01T00:00:00.000Z',
      registrationClosesAt: '2030-01-01T00:00:00.000Z',
      drawAt: '2030-01-02T00:00:00.000Z',
      entitlement: null,
    });
    vi.mocked(lotteryApi.fetchLotteryConfig).mockResolvedValue({
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
      status: 'SCHEDULED',
      registrationOpensAt: '2026-01-01T00:00:00.000Z',
      registrationClosesAt: '2030-01-01T00:00:00.000Z',
      drawAt: '2030-01-02T00:00:00.000Z',
      allocation: 2,
      entitlementTtlMinutes: 15,
    });
    vi.mocked(lotteryApi.fetchLotteryRegistrations).mockResolvedValue({
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
      registrations: [
        {
          registrationId: '33333333-3333-3333-3333-333333333333',
          userId: '44444444-4444-4444-4444-444444444444',
          userEmail: 'user@example.com',
          userDisplayName: 'User One',
          desiredQuantity: 2,
          status: 'REGISTERED',
          registeredAt: '2026-01-01T01:00:00.000Z',
          wonAt: null,
          notSelectedAt: null,
          withdrawnAt: null,
          fulfilledAt: null,
          entitlement: null,
        },
      ],
    });
    vi.mocked(lotteryApi.runLotteryDrawNow).mockResolvedValue({
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
      granted: 1,
      notSelected: 0,
    });

    renderWithAuthProviders();

    expect(await screen.findByText('Lottery test controls')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Xem DS dang ky/ }));
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Quay so ngay/ }));
    expect(lotteryApi.runLotteryDrawNow).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
    );
  });

  it('hides operator controls from a normal audience user', async () => {
    localStorage.setItem('ticketbox_audience_token', makeToken(['AUDIENCE']));
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(lotteryConcert as any);
    vi.mocked(lotteryApi.fetchLotteryStatus).mockResolvedValue({
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
      registrationId: null,
      registrationStatus: null,
      desiredQuantity: null,
      configStatus: 'SCHEDULED',
      registrationOpensAt: '2026-01-01T00:00:00.000Z',
      registrationClosesAt: '2030-01-01T00:00:00.000Z',
      drawAt: '2030-01-02T00:00:00.000Z',
      entitlement: null,
    });

    renderWithAuthProviders();

    await screen.findByText('Ticket 1');
    expect(screen.queryByText('Lottery test controls')).not.toBeInTheDocument();
  });
});

describe.skip('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockValidConcert = {
    id: '1', slug: 'c1', title: 'Concert 1', artistName: 'Artist 1', city: 'HCMC', startsAt: '2026-07-01T00:00:00Z', venueName: 'Venue',
    availabilitySummary: { totalAvailableQuantity: 10, minPriceVnd: 100 },
    publishedArtistBio: 'Artist Bio Test',
    seatingMapAsset: { id: 'asset-1', publicUrl: '/uploads/seating-maps/map.svg' },
    seatingZones: [
      { id: 'z1', svgElementId: 'zone-1', label: 'Zone 1', color: '#ff0000', status: 'ACTIVE', displayOrder: 1 }
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

  it('renders the interactive seating zone map when seatingMapAsset and zones are present', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('seating-zone-map')).toBeInTheDocument();
    });
  });

  it('does not render a numeric per-zone availability count anywhere', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('seating-zone-map')).toBeInTheDocument();
    });
    expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument();
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

  it('sold-out ticket type keeps "Xem vị trí" enabled while quantity stepper stays disabled', async () => {
    const soldOutConcert = {
      ...mockValidConcert,
      ticketTypes: [
        { ...mockValidConcert.ticketTypes[0], availableQuantity: 0, status: 'SOLD_OUT' }
      ]
    };
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(soldOutConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByLabelText('Tăng số lượng vé Ticket 1')).toBeDisabled();
    });

    const viewLocationBtn = screen.getByRole('button', { name: /Xem vị trí/ });
    expect(viewLocationBtn).not.toBeDisabled();
  });

  it('"Xem vị trí" is hidden for a ticket type with no mapped zones', async () => {
    const noZoneConcert = {
      ...mockValidConcert,
      ticketTypes: [{ ...mockValidConcert.ticketTypes[0], zoneIds: [] }],
    };
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(noZoneConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Ticket 1')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Xem vị trí/ })).not.toBeInTheDocument();
  });

  it('"Xem vị trí" passes the clicked ticket type id to the map as activeTicketTypeId', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xem vị trí/ })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Xem vị trí/ }));

    expect(screen.getByTestId('seating-zone-map')).toHaveAttribute('data-active-tt', 'tt1');
  });

  it('"Xem vị trí" toggles off when clicked twice', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    const viewLocationBtn = await screen.findByRole('button', { name: /Xem vị trí/ });
    await userEvent.click(viewLocationBtn);
    expect(screen.getByTestId('seating-zone-map')).toHaveAttribute('data-active-tt', 'tt1');

    await userEvent.click(viewLocationBtn);
    expect(screen.getByTestId('seating-zone-map')).toHaveAttribute('data-active-tt', '');
  });

  it('renders static fallback image and ticket-type-name zone legend when the map signals a load error', async () => {
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('seating-zone-map')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('trigger-error'));

    await waitFor(() => {
      expect(screen.queryByTestId('seating-zone-map')).not.toBeInTheDocument();
      expect(screen.getByAltText('Sơ đồ sự kiện')).toBeInTheDocument();
    });
    expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument();
  });

  it('checkout navigates with an unchanged {ticketTypeId, quantity} payload shape', async () => {
    localStorage.setItem('ticketbox_audience_token', 'fake-token');
    vi.mocked(catalogApi.fetchConcertDetail).mockResolvedValue(mockValidConcert as any);
    renderWithProviders();

    const increaseBtn = await screen.findByLabelText('Tăng số lượng vé Ticket 1');
    await userEvent.click(increaseBtn);

    await userEvent.click(screen.getByText('Tiếp tục mua vé'));

    await waitFor(() => {
      expect(screen.getByTestId('checkout-state')).toBeInTheDocument();
    });

    const state = JSON.parse(screen.getByTestId('checkout-state').textContent ?? '{}');
    expect(state.quantities).toEqual([['tt1', 1]]);
    expect(state).not.toHaveProperty('zoneId');
    expect(state).not.toHaveProperty('seatingZoneId');
    expect(state).not.toHaveProperty('selectedZoneId');
  });
});
