import { describe, expect, it } from 'vitest';

import { resolveConcertPosterUrl } from './concert-image';

describe('resolveConcertPosterUrl', () => {
  it('prefers the stored public URL over the asset streaming endpoint', () => {
    expect(resolveConcertPosterUrl({
      posterAssetId: 'poster-id',
      posterAsset: {
        id: 'poster-id',
        kind: 'POSTER',
        status: 'ACTIVE',
        publicUrl: 'https://images.example.com/poster.jpg',
        originalName: 'poster.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 123,
      },
    })).toBe('https://images.example.com/poster.jpg');
  });

  it('falls back to the asset endpoint when publicUrl is absent', () => {
    expect(resolveConcertPosterUrl({
      posterAssetId: 'poster-id',
      posterAsset: null,
    })).toBe('http://localhost:3000/assets/poster-id');
  });

  it('returns null when the concert has no poster', () => {
    expect(resolveConcertPosterUrl({ posterAssetId: null, posterAsset: null })).toBeNull();
  });
});
