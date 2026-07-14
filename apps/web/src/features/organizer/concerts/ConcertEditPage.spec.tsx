// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcertEditPage } from './ConcertEditPage';
import * as hooks from './hooks';

vi.mock('./hooks', () => ({
  useConcert: vi.fn(),
  useUpdateConcertMutation: vi.fn(),
  useUploadPosterMutation: vi.fn(),
  useUploadBannerMutation: vi.fn(),
  useReplaceArtistsMutation: vi.fn(),
}));
vi.mock('../../concerts-shared/components/VenueLocationPicker', () => ({ VenueLocationPicker: () => <div /> }));
vi.mock('../../concerts-shared/ui/ArtistSelector', () => ({ ArtistSelector: () => <div /> }));
vi.mock('../../concerts-shared/waiting-room/WaitingRoomConfigSection', () => ({
  WaitingRoomConfigSection: ({ concertId }: { concertId: string }) => <button type="button" data-testid="waiting-room-section">{concertId}</button>,
}));

const CONCERT_ID = '22222222-2222-4222-8222-222222222222';
const mutation = { mutate: vi.fn(), isPending: false };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/organizer/concerts/${CONCERT_ID}/edit`]}>
      <Routes><Route path="/organizer/concerts/:id/edit" element={<ConcertEditPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('organizer ConcertEditPage waiting room integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useConcert).mockReturnValue({ data: {
      id: CONCERT_ID, title: 'Concert', slug: 'concert', artistName: 'Artist', venueName: 'Venue', venueAddress: '',
      latitude: null, longitude: null, city: 'HCM', startsAt: '2026-08-01T12:00:00.000Z', endsAt: '2026-08-01T15:00:00.000Z',
      description: '', eventType: 'CONCERT', isFeatured: false, displayOrder: 0, seoTitle: null, seoDescription: null,
      seoImageUrl: null, status: 'DRAFT', artists: [], posterAsset: null, bannerAsset: null,
    }, isLoading: false, isError: false, error: null } as never);
    vi.mocked(hooks.useUpdateConcertMutation).mockReturnValue(mutation as never);
    vi.mocked(hooks.useUploadPosterMutation).mockReturnValue(mutation as never);
    vi.mocked(hooks.useUploadBannerMutation).mockReturnValue(mutation as never);
    vi.mocked(hooks.useReplaceArtistsMutation).mockReturnValue(mutation as never);
  });

  it('renders the same shared section with the owned concert ID without submitting the parent form', async () => {
    renderPage();
    const section = await screen.findByTestId('waiting-room-section');
    expect(section).toHaveTextContent(CONCERT_ID);
    await userEvent.click(section);
    expect(mutation.mutate).not.toHaveBeenCalled();
  });
});
