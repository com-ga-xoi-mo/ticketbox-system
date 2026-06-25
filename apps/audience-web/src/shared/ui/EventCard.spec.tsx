import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventCard } from './EventCard';
import type { PublicConcertSummary } from '@ticketbox/api-types';

const concertId = '22222222-2222-4222-8222-222222222222';
const assetId = '55555555-5555-4555-8555-555555555555';

const baseConcert: PublicConcertSummary = {
  id: concertId,
  slug: 'summer-beats',
  title: 'Summer Beats',
  artistName: 'The Suns',
  venueName: 'TicketBox Arena',
  city: 'Ho Chi Minh City',
  startsAt: '2026-07-01T12:00:00.000Z',
  endsAt: '2026-07-01T15:00:00.000Z',
  eventType: 'CONCERT',
  posterAsset: null,
  availabilitySummary: {
    totalAvailableQuantity: 120,
    minPriceVnd: 450000,
    maxPriceVnd: 1250000,
    ticketTypeCount: 2,
  },
};

function renderCard(concert: PublicConcertSummary) {
  return render(
    <MemoryRouter>
      <EventCard concert={concert} />
    </MemoryRouter>,
  );
}

describe('EventCard', () => {
  it('renders concert title and artist', () => {
    renderCard(baseConcert);
    expect(screen.getByText('Summer Beats')).toBeInTheDocument();
    expect(screen.getByText('The Suns')).toBeInTheDocument();
  });

  it('renders venue and city', () => {
    renderCard(baseConcert);
    expect(screen.getByText(/TicketBox Arena/)).toBeInTheDocument();
  });

  it('renders price when available', () => {
    renderCard(baseConcert);
    expect(screen.getByText(/450\.000/)).toBeInTheDocument();
  });

  it('links to the event detail route', () => {
    renderCard(baseConcert);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/events/summer-beats');
  });

  it('shows sold-out badge when totalAvailableQuantity is 0', () => {
    const soldOut = {
      ...baseConcert,
      availabilitySummary: { ...baseConcert.availabilitySummary, totalAvailableQuantity: 0 },
    };
    renderCard(soldOut);
    expect(screen.getByText('Hết vé')).toBeInTheDocument();
  });

  it('renders poster image when posterAsset is provided', () => {
    const withPoster = {
      ...baseConcert,
      posterAsset: {
        id: assetId,
        kind: 'POSTER' as const,
        status: 'ACTIVE' as const,
        publicUrl: 'https://cdn.example.com/poster.jpg',
        originalName: 'poster.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 2048,
      },
    };
    renderCard(withPoster);
    expect(screen.getByAltText('Summer Beats')).toBeInTheDocument();
  });

  it('renders emoji placeholder when no poster', () => {
    renderCard(baseConcert);
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });
});
