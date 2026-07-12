import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicConcertDetailResponse, PublicConcertReviewsResponse } from '@ticketbox/api-types';

import { useConcertReviews, useCreateConcertReview, useDeleteMyConcertReview, useUpdateMyConcertReview } from '../../../shared/api/concert-reviews';
import { useMyTickets } from '../../../shared/api/tickets';
import { AuthContext, type Session } from '../../../shared/auth/AuthContext';
import { ConcertReviewsSection } from './ConcertReviewsSection';

vi.mock('../../../shared/api/tickets', () => ({
  useMyTickets: vi.fn(),
}));

vi.mock('../../../shared/api/concert-reviews', () => ({
  useConcertReviews: vi.fn(),
  useCreateConcertReview: vi.fn(),
  useUpdateMyConcertReview: vi.fn(),
  useDeleteMyConcertReview: vi.fn(),
}));

const concert = {
  id: 'concert-1',
  slug: 'concert-slug',
  title: 'Concert',
} as PublicConcertDetailResponse;

const session: Session = {
  sub: 'user-1',
  roles: ['AUDIENCE'],
};

const visibleReviews: PublicConcertReviewsResponse = {
  summary: { averageRating: 4.5, reviewCount: 2 },
  reviews: [
    {
      id: 'review-1',
      concertId: 'concert-1',
      rating: 5,
      comment: 'Loved the show',
      author: { id: 'user-2', displayName: 'Other buyer' },
      createdAt: '2026-07-07T00:00:00.000Z',
      updatedAt: '2026-07-07T00:00:00.000Z',
    },
    {
      id: 'review-mine',
      concertId: 'concert-1',
      rating: 4,
      comment: 'My review',
      author: { id: 'user-1', displayName: 'Me' },
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    },
  ],
};

const emptyReviews: PublicConcertReviewsResponse = {
  summary: { averageRating: null, reviewCount: 0 },
  reviews: [],
};

function renderSection(currentSession: Session | null = session) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          session: currentSession,
          signIn: vi.fn(),
          signOut: vi.fn(),
        }}
      >
        <ConcertReviewsSection concert={concert} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCreateConcertReview).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useUpdateMyConcertReview).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useDeleteMyConcertReview).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
});

describe('ConcertReviewsSection', () => {
  it('renders review summary and visible review list', () => {
    vi.mocked(useConcertReviews).mockReturnValue({ data: visibleReviews, isLoading: false } as any);
    vi.mocked(useMyTickets).mockReturnValue({ data: [] } as any);

    renderSection();

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('Loved the show')).toBeInTheDocument();
    expect(screen.queryByText('Hidden review')).not.toBeInTheDocument();
  });

  it('renders empty state when there are no visible reviews', () => {
    vi.mocked(useConcertReviews).mockReturnValue({ data: emptyReviews, isLoading: false } as any);
    vi.mocked(useMyTickets).mockReturnValue({ data: [] } as any);

    renderSection();

    expect(screen.queryByText('Loved the show')).not.toBeInTheDocument();
    expect(screen.queryByText('My review')).not.toBeInTheDocument();
  });

  it('shows review form for an eligible buyer without an existing review', () => {
    vi.mocked(useConcertReviews).mockReturnValue({ data: emptyReviews, isLoading: false } as any);
    vi.mocked(useMyTickets).mockReturnValue({
      data: [{ id: 'ticket-1', concertId: 'concert-1', status: 'ISSUED' }],
    } as any);

    renderSection();

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows edit and delete controls for the current user review', async () => {
    const user = userEvent.setup();
    vi.mocked(useConcertReviews).mockReturnValue({ data: visibleReviews, isLoading: false } as any);
    vi.mocked(useMyTickets).mockReturnValue({
      data: [{ id: 'ticket-1', concertId: 'concert-1', status: 'ISSUED' }],
    } as any);

    renderSection();

    expect(screen.getByText('My review')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    await act(async () => {
      await user.click(buttons[0]);
    });

    expect(await screen.findByRole('textbox')).toHaveValue('My review');
  });
});
