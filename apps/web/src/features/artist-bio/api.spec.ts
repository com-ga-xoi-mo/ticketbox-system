import { describe, expect, it, vi, afterEach } from 'vitest';

import * as client from '../../shared/api/client';
import { ApiError } from '../../shared/api/client';
import { createArtistBioApi } from './api';

vi.mock('../../shared/api/client', () => {
  class MockApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }

  return { ApiError: MockApiError, get: vi.fn(), post: vi.fn() };
});

const id = '11111111-1111-4111-8111-111111111111';
const response = {
  id,
  concertId: '22222222-2222-4222-8222-222222222222',
  pressKitAssetId: null,
  status: 'DRAFT',
  generatedBio: null,
  publishedBio: null,
  provider: null,
  errorMessage: null,
  retryCount: 0,
  maxAttempts: 3,
  lastAttemptedAt: null,
  nextRetryAt: null,
  requestedById: null,
  reviewedById: null,
  publishedAt: null,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
};

describe('artist bio API', () => {
  afterEach(() => vi.clearAllMocks());

  it('uses organizer paths for all workflow operations', async () => {
    vi.mocked(client.get).mockResolvedValue(response);
    vi.mocked(client.post).mockResolvedValue(response);
    const api = createArtistBioApi('ORGANIZER');
    await api.fetchArtistBio(response.concertId);
    await api.retryArtistBio(response.concertId, id);
    await api.publishArtistBio(response.concertId, id);
    await api.rejectArtistBio(response.concertId, id);
    expect(client.get).toHaveBeenCalledWith(`/organizer/concerts/${response.concertId}/artist-bio`);
    expect(client.post).toHaveBeenCalledWith(
      `/organizer/concerts/${response.concertId}/artist-bio/${id}/retry`,
      {},
    );
    expect(client.post).toHaveBeenCalledWith(
      `/organizer/concerts/${response.concertId}/artist-bio/${id}/publish`,
      {},
    );
    expect(client.post).toHaveBeenCalledWith(
      `/organizer/concerts/${response.concertId}/artist-bio/${id}/reject`,
      {},
    );
  });

  it('uses admin paths and normalizes coded no-job responses', async () => {
    vi.mocked(client.get).mockRejectedValue(new ApiError('missing', 404, 'ARTIST_BIO_NOT_FOUND'));
    const api = createArtistBioApi('ADMIN');
    await expect(api.fetchArtistBio(response.concertId)).resolves.toBeNull();
    expect(client.get).toHaveBeenCalledWith(`/admin/concerts/${response.concertId}/artist-bio`);
  });

  it('uploads a validated PDF as a base64 JSON payload', async () => {
    vi.mocked(client.post).mockResolvedValue(response);
    const file = new File(['%PDF-1.7'], 'press.pdf', { type: 'application/pdf' });
    await createArtistBioApi('ORGANIZER').uploadArtistBioPressKit(response.concertId, file);
    expect(client.post).toHaveBeenCalledWith(
      `/organizer/concerts/${response.concertId}/artist-bio`,
      expect.objectContaining({
        originalName: 'press.pdf',
        contentType: 'application/pdf',
        contentBase64: expect.any(String),
      }),
    );
  });
});
