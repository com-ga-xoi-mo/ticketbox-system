import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { EventListPage } from './EventListPage';
import { useConcertList, useConcertCities } from '../../shared/api/catalog';

vi.mock('../../shared/api/catalog', () => ({
  useConcertList: vi.fn(),
  useConcertCities: vi.fn(),
}));

function renderWithRouter(initialUrl = '/events') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/events" element={<EventListPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useConcertList).mockReturnValue({ isLoading: true } as any);
    vi.mocked(useConcertCities).mockReturnValue({ data: [] } as any);

    renderWithRouter();
    expect(screen.getByText('Sự kiện sắp diễn ra')).toBeInTheDocument();
    // Loading skeleton should be present (via PageLoading)
  });

  it('renders concerts grid when data exists', () => {
    vi.mocked(useConcertList).mockReturnValue({
      data: [
        { id: '1', slug: 'c1', title: 'Concert 1', artistName: 'Artist 1', city: 'HCMC', startsAt: '2026-07-01T00:00:00Z', venueName: 'Venue', availabilitySummary: { totalAvailableQuantity: 10, minPriceVnd: 100 } }
      ]
    } as any);
    vi.mocked(useConcertCities).mockReturnValue({ data: ['HCMC'] } as any);

    renderWithRouter();
    expect(screen.getByText('Concert 1')).toBeInTheDocument();
  });

  it('renders no results state when data is empty and filters active', () => {
    vi.mocked(useConcertList).mockReturnValue({ data: [] } as any);
    vi.mocked(useConcertCities).mockReturnValue({ data: ['HCMC'] } as any);

    renderWithRouter('/events?q=rock');
    expect(screen.getByText('Không tìm thấy kết quả')).toBeInTheDocument();
    expect(screen.getByText('Không có sự kiện nào khớp với các điều kiện lọc của bạn.')).toBeInTheDocument();
  });

  it('syncs filter state from URL', () => {
    vi.mocked(useConcertList).mockReturnValue({ data: [] } as any);
    vi.mocked(useConcertCities).mockReturnValue({ data: ['HCMC'] } as any);

    renderWithRouter('/events?q=rock&minPrice=100000');
    const qInput = screen.getByPlaceholderText('Tên sự kiện, nghệ sĩ...');
    expect(qInput).toHaveValue('rock');

    const minPriceInput = screen.getByPlaceholderText('Min');
    expect(minPriceInput).toHaveValue(100000);
  });

  it('applies filters on submit', async () => {
    vi.mocked(useConcertList).mockReturnValue({ data: [] } as any);
    vi.mocked(useConcertCities).mockReturnValue({ data: ['HCMC'] } as any);

    renderWithRouter();
    
    const qInput = screen.getByPlaceholderText('Tên sự kiện, nghệ sĩ...');
    await userEvent.type(qInput, 'jazz');
    
    const submitBtn = screen.getByRole('button', { name: /^Lọc$/i });
    await userEvent.click(submitBtn);

    // useConcertList should be called with q=jazz 
    // Wait, useConcertList is called on render with current URL params.
    // When URL updates, it rerenders. The hook is mocked, so we can check if it's called with new params.
    // Wait, the hook is called every render.
    await waitFor(() => {
      expect(useConcertList).toHaveBeenCalledWith(expect.objectContaining({ q: 'jazz' }));
    });
  });
});
