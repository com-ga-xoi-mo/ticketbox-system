// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArtistBioPanel } from './ArtistBioPanel';

const mutate = vi.fn();
const mutations = {
  upload: { isPending: false, error: null, mutate },
  retry: { isPending: false, error: null, mutate },
  publish: { isPending: false, error: null, mutate },
  reject: { isPending: false, error: null, mutate },
};
let bio: Record<string, unknown> | null = null;

vi.mock('./hooks', () => ({
  useArtistBioScope: () => ({ role: 'ORGANIZER', sub: 'organizer-1' }),
  useArtistBio: () => ({ data: bio, isLoading: false, error: null }),
  useArtistBioMutations: () => mutations,
}));

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  concertId: '22222222-2222-4222-8222-222222222222',
  pressKitAssetId: null,
  generatedBio: 'Generated biography',
  publishedBio: 'Published biography',
  provider: null,
  errorMessage: 'AI provider unavailable',
  retryCount: 1,
  maxAttempts: 3,
  lastAttemptedAt: null,
  nextRetryAt: null,
  requestedById: null,
  reviewedById: null,
  publishedAt: null,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
};

describe('ArtistBioPanel', () => {
  it.each([
    [null, 'Tải lên PDF press kit'],
    [{ ...base, status: 'REJECTED' }, 'Tạo lại'],
    [{ ...base, status: 'DRAFT' }, 'Đang xếp hàng tạo tiểu sử…'],
    [{ ...base, status: 'PROCESSING' }, 'Đang tạo tiểu sử…'],
    [{ ...base, status: 'READY_FOR_REVIEW' }, 'Duyệt & công khai'],
    [{ ...base, status: 'PUBLISHED' }, 'Đã công khai'],
    [{ ...base, status: 'FAILED' }, 'AI provider unavailable'],
  ])('renders the expected state surface', (state, text) => {
    bio = state;
    render(<ArtistBioPanel concertId={base.concertId} role="ORGANIZER" />);
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it('disables retry until nextRetryAt has passed', () => {
    bio = { ...base, status: 'FAILED', nextRetryAt: '2099-01-01T00:00:00.000Z' };
    render(<ArtistBioPanel concertId={base.concertId} role="ORGANIZER" />);
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDisabled();
  });
});
