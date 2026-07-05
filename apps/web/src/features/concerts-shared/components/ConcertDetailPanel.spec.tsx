// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConcertDetailPanel } from './ConcertDetailPanel';
import type { Concert } from '../types';

function makeConcert(overrides: Partial<Concert> = {}): Concert {
  return {
    id: 'c1',
    slug: 'midnight-echo',
    title: 'Midnight Echo Live',
    artistName: 'Legacy Name',
    venueName: 'Grand Arena',
    city: 'Ho Chi Minh City',
    startsAt: '2026-08-01T19:00:00.000Z',
    endsAt: '2026-08-01T22:00:00.000Z',
    status: 'PUBLISHED',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ConcertDetailPanel', () => {
  it('shows the legacy artistName when the concert has no linked artists', () => {
    render(<ConcertDetailPanel concert={makeConcert()} />);
    expect(screen.getByText('Legacy Name')).toBeInTheDocument();
  });

  it('lists linked artists in display order with a Primary badge on the first', () => {
    const concert = makeConcert({
      artists: [
        { id: 'a2', displayName: 'Second Act', status: 'ACTIVE', displayOrder: 1 },
        { id: 'a1', displayName: 'Headliner', status: 'ACTIVE', displayOrder: 0 },
      ],
    });
    render(<ConcertDetailPanel concert={concert} />);
    // hero line joins ordered names
    expect(screen.getByText('Headliner, Second Act')).toBeInTheDocument();
    // event info section lists each artist; the primary badge sits next to the first
    expect(screen.getByText('Chính')).toBeInTheDocument();
    const artistRows = screen.getAllByText(/Headliner|Second Act/);
    expect(artistRows.length).toBeGreaterThanOrEqual(2);
  });

  it('marks inactive linked artists with an Inactive badge while keeping them visible', () => {
    const concert = makeConcert({
      artists: [
        { id: 'a1', displayName: 'Headliner', status: 'ACTIVE', displayOrder: 0 },
        { id: 'a3', displayName: 'Retired Band', status: 'INACTIVE', displayOrder: 1 },
      ],
    });
    render(<ConcertDetailPanel concert={concert} />);
    expect(screen.getByText('Retired Band')).toBeInTheDocument();
    expect(screen.getByText('Không hoạt động')).toBeInTheDocument();
  });

  it('shows the event type label in the hero', () => {
    render(<ConcertDetailPanel concert={makeConcert({ eventType: 'THEATRE' })} />);
    expect(screen.getByText('Nhà hát')).toBeInTheDocument();
  });

  it('renders the poster from an external seeded publicUrl', () => {
    const concert = makeConcert({
      posterAsset: {
        id: 'p1',
        kind: 'POSTER',
        status: 'ACTIVE',
        publicUrl: 'https://images.example.com/poster.jpg',
        originalName: 'poster.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 100,
      },
    });
    render(<ConcertDetailPanel concert={concert} />);
    expect(screen.getByAltText('Midnight Echo Live')).toHaveAttribute(
      'src',
      'https://images.example.com/poster.jpg',
    );
  });

  it('falls back to the /assets/:id endpoint when publicUrl is absent', () => {
    const concert = makeConcert({ posterAsset: null, posterAssetId: 'asset-9' });
    render(<ConcertDetailPanel concert={concert} />);
    expect(screen.getByAltText('Midnight Echo Live').getAttribute('src')).toContain('/assets/asset-9');
  });
});
