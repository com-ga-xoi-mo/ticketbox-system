// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArtistsPage } from './ArtistsPage';
import * as api from './api';
import type { ManagementArtistResponse, AdminArtistListResponse } from '@ticketbox/api-types';

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

const ARTIST_ID_1 = '11111111-1111-4111-8111-111111111111';
const ARTIST_ID_2 = '22222222-2222-4222-8222-222222222222';

function makeArtist(overrides: Partial<ManagementArtistResponse> = {}): ManagementArtistResponse {
  return {
    id: ARTIST_ID_1,
    slug: 'the-midnight',
    displayName: 'The Midnight',
    bio: null,
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

function makeListResponse(
  items: ManagementArtistResponse[],
  overrides: Partial<AdminArtistListResponse> = {},
): AdminArtistListResponse {
  return { items, total: items.length, limit: 20, offset: 0, ...overrides };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/artists']}>
        <ArtistsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ArtistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ACTIVE and INACTIVE artists returned by the protected list', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(
      makeListResponse([
        makeArtist(),
        makeArtist({ id: ARTIST_ID_2, slug: 'retired-band', displayName: 'Retired Band', status: 'INACTIVE' }),
      ]),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('The Midnight')).toBeInTheDocument();
      expect(screen.getByText('Retired Band')).toBeInTheDocument();
    });
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('resolves the avatar public URL when present', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(
      makeListResponse([
        makeArtist({
          avatarAsset: {
            id: '33333333-3333-4333-8333-333333333333',
            kind: 'ARTIST_AVATAR',
            status: 'ACTIVE',
            publicUrl: 'https://cdn.example.com/avatar.png',
            originalName: 'avatar.png',
            contentType: 'image/png',
            sizeBytes: 100,
          },
        }),
      ]),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByAltText('The Midnight')).toHaveAttribute(
        'src',
        'https://cdn.example.com/avatar.png',
      );
    });
  });

  it('sends the debounced search query to the protected list endpoint', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(makeListResponse([]));
    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Tìm kiếm nghệ sĩ...'), 'mid');

    await waitFor(() => {
      const calls = vi.mocked(api.listArtists).mock.calls;
      expect(calls.some(([params]) => params.q === 'mid')).toBe(true);
    });
  });

  it('sends the status filter to the protected list endpoint', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(makeListResponse([]));
    renderPage();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'INACTIVE');

    await waitFor(() => {
      const calls = vi.mocked(api.listArtists).mock.calls;
      expect(calls.some(([params]) => params.status === 'INACTIVE')).toBe(true);
    });
  });

  it('paginates with Next using limit/offset and disables Previous on the first page', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(makeListResponse([makeArtist()], { total: 45 }));
    renderPage();

    const nextBtn = await screen.findByRole('button', { name: 'Sau' });
    expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled();

    await userEvent.click(nextBtn);

    await waitFor(() => {
      const calls = vi.mocked(api.listArtists).mock.calls;
      expect(calls.some(([params]) => params.offset === 20)).toBe(true);
    });
  });

  it('shows the empty state when no artists match', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(makeListResponse([]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy nghệ sĩ.')).toBeInTheDocument();
    });
  });

  it('creates an artist from the Add Artist action and refreshes the list', async () => {
    vi.mocked(api.listArtists).mockResolvedValue(makeListResponse([]));
    vi.mocked(api.createArtist).mockResolvedValue(makeArtist({ slug: 'new-artist', displayName: 'New Artist' }));
    vi.stubGlobal('prompt', vi.fn().mockReturnValueOnce('new-artist').mockReturnValueOnce('New Artist'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Thêm nghệ sĩ/ }));

    await waitFor(() => {
      expect(api.createArtist).toHaveBeenCalledWith({
        slug: 'new-artist',
        displayName: 'New Artist',
        status: 'ACTIVE',
      });
    });
    vi.unstubAllGlobals();
  });

  it('shows an error state when the list request fails', async () => {
    vi.mocked(api.listArtists).mockRejectedValue(new Error('boom'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải danh sách nghệ sĩ')).toBeInTheDocument();
    });
  });
});
