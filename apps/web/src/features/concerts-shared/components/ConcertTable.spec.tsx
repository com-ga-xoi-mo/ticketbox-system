// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConcertTable } from './ConcertTable';
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

describe('ConcertTable', () => {
  it('shows the legacy artistName when the concert has no linked artists', () => {
    render(<ConcertTable concerts={[makeConcert()]} />);
    expect(screen.getByText('Legacy Name')).toBeInTheDocument();
  });

  it('shows ordered linked artist names instead of the legacy name', () => {
    const concert = makeConcert({
      artists: [
        { id: 'a2', displayName: 'Second Act', status: 'ACTIVE', displayOrder: 1 },
        { id: 'a1', displayName: 'Headliner', status: 'ACTIVE', displayOrder: 0 },
      ],
    });
    render(<ConcertTable concerts={[concert]} />);
    expect(screen.getByText('Headliner, Second Act')).toBeInTheDocument();
    expect(screen.queryByText('Legacy Name')).not.toBeInTheDocument();
  });

  it('shows an event type chip for non-CONCERT event types', () => {
    render(<ConcertTable concerts={[makeConcert({ eventType: 'WORKSHOP' })]} onSelect={() => {}} />);
    expect(screen.getByText('Hội thảo')).toBeInTheDocument();
  });

  it('does not show a chip for the default CONCERT event type', () => {
    render(<ConcertTable concerts={[makeConcert({ eventType: 'CONCERT' })]} />);
    expect(screen.queryByText('Sự kiện âm nhạc')).not.toBeInTheDocument();
  });

  it('renders the poster from an external publicUrl as-is', () => {
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
    render(<ConcertTable concerts={[concert]} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://images.example.com/poster.jpg');
  });

  it('falls back to the /assets/:id endpoint when there is no publicUrl', () => {
    const concert = makeConcert({ posterAsset: null, posterAssetId: 'asset-9' });
    render(<ConcertTable concerts={[concert]} />);
    expect(screen.getByRole('img').getAttribute('src')).toContain('/assets/asset-9');
  });

  it('invokes onSelect with the clicked concert', async () => {
    const onSelect = vi.fn();
    const concert = makeConcert();
    render(<ConcertTable concerts={[concert]} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Midnight Echo Live'));
    expect(onSelect).toHaveBeenCalledWith(concert);
  });
});
