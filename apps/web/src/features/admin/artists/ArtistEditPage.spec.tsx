// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArtistEditPage } from './ArtistEditPage';
import * as api from './api';
import { toast } from 'sonner';
import type { ManagementArtistResponse } from '@ticketbox/api-types';

vi.mock('./api', () => ({
  listArtists: vi.fn(),
  createArtist: vi.fn(),
  updateArtist: vi.fn(),
  uploadArtistAvatar: vi.fn(),
  uploadArtistPoster: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ARTIST_ID = '11111111-1111-4111-8111-111111111111';
const ASSET_ID = '33333333-3333-4333-8333-333333333333';

function makeArtist(overrides: Partial<ManagementArtistResponse> = {}): ManagementArtistResponse {
  return {
    id: ARTIST_ID,
    slug: 'the-midnight',
    displayName: 'The Midnight',
    bio: 'Synthwave duo',
    status: 'ACTIVE',
    avatarAssetId: null,
    posterAssetId: null,
    followerCount: 0,
    favoriteCount: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    avatarAsset: null,
    posterAsset: null,
    ...overrides,
  };
}

function renderPage(artist = makeArtist()) {
  vi.mocked(api.listArtists).mockResolvedValue({
    items: [artist],
    total: 1,
    limit: 20,
    offset: 0,
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/artists/${ARTIST_ID}/edit`]}>
        <Routes>
          <Route path="/admin/artists/:id/edit" element={<ArtistEditPage />} />
          <Route path="/admin/artists" element={<div data-testid="artists-list" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ArtistEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates the form from the artist data', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Midnight')).toBeInTheDocument();
      expect(screen.getByDisplayValue('the-midnight')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Synthwave duo')).toBeInTheDocument();
    });
  });

  it('submits the edited fields through the update contract and navigates back', async () => {
    vi.mocked(api.updateArtist).mockResolvedValue(makeArtist({ displayName: 'Renamed' }));
    renderPage();

    const nameInput = await screen.findByDisplayValue('The Midnight');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Renamed');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'INACTIVE');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(api.updateArtist).toHaveBeenCalledWith(ARTIST_ID, {
        slug: 'the-midnight',
        displayName: 'Renamed',
        bio: 'Synthwave duo',
        status: 'INACTIVE',
      });
      expect(screen.getByTestId('artists-list')).toBeInTheDocument();
    });
  });

  it('surfaces a safe error toast when the update is rejected', async () => {
    vi.mocked(api.updateArtist).mockRejectedValue(new Error('Slug already exists'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Slug already exists');
    });
  });

  it('uploads a valid avatar and reports success', async () => {
    vi.mocked(api.uploadArtistAvatar).mockResolvedValue({
      assetId: ASSET_ID,
      publicUrl: 'https://cdn.example.com/avatar.png',
    });
    const { container } = renderPage();

    await screen.findByRole('button', { name: 'Tải lên ảnh đại diện' });
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(api.uploadArtistAvatar).toHaveBeenCalledWith(ARTIST_ID, file);
      expect(toast.success).toHaveBeenCalledWith('Đã tải lên ảnh đại diện');
    });
  });

  it('uploads a poster and reports success', async () => {
    vi.mocked(api.uploadArtistPoster).mockResolvedValue({
      assetId: ASSET_ID,
      publicUrl: 'https://cdn.example.com/poster.png',
    });
    const { container } = renderPage();

    await screen.findByRole('button', { name: 'Tải lên ảnh bìa' });
    const file = new File(['x'], 'poster.png', { type: 'image/png' });
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[1], { target: { files: [file] } });

    await waitFor(() => {
      expect(api.uploadArtistPoster).toHaveBeenCalledWith(ARTIST_ID, file);
      expect(toast.success).toHaveBeenCalledWith('Đã tải lên ảnh bìa');
    });
  });

  it('rejects an upload response that does not match the shared contract', async () => {
    // Missing assetId: the shared-schema validation must fail safely.
    vi.mocked(api.uploadArtistAvatar).mockResolvedValue({ publicUrl: 'not-a-url' } as never);
    const { container } = renderPage();

    await screen.findByRole('button', { name: 'Tải lên ảnh đại diện' });
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Received an unexpected response from the server.');
    });
  });

  it('renders the existing avatar from its public URL', async () => {
    renderPage(
      makeArtist({
        avatarAsset: {
          id: ASSET_ID,
          kind: 'ARTIST_AVATAR',
          status: 'ACTIVE',
          publicUrl: 'https://cdn.example.com/avatar.png',
          originalName: 'avatar.png',
          contentType: 'image/png',
          sizeBytes: 100,
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByAltText('Avatar')).toHaveAttribute(
        'src',
        'https://cdn.example.com/avatar.png',
      );
    });
  });
});
