import { describe, expect, it, vi } from 'vitest';
import { PublicArtistListResponseSchema } from '@ticketbox/api-types';

import { PublicArtistController } from './public-artist.controller';

const rawArtist = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'the-midnight',
  displayName: 'The Midnight',
  bio: 'Synthwave duo.',
  status: 'ACTIVE',
  avatarAssetId: '22222222-2222-4222-8222-222222222222',
  posterAssetId: null,
  followerCount: 3,
  favoriteCount: 7,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  avatarAsset: {
    id: '22222222-2222-4222-8222-222222222222',
    kind: 'POSTER',
    status: 'ACTIVE',
    publicUrl: 'https://cdn.example.com/avatar.jpg',
    originalName: 'avatar.jpg',
    contentType: 'image/jpeg',
    sizeBytes: null,
    // internals that must never leak into the public payload
    storageKey: 'demo/artist/avatar.jpg',
    checksum: 'sha256:abc',
    uploadedById: '33333333-3333-4333-8333-333333333333',
    metadata: { seeded: true },
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  },
};

describe('PublicArtistController.list', () => {
  it('returns a payload that satisfies the strict public artist list contract', async () => {
    const controller = new PublicArtistController(
      { execute: vi.fn().mockResolvedValue({ items: [rawArtist], total: 1 }) } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );

    const payload = await controller.list('mid', 20, 0);

    expect(() => PublicArtistListResponseSchema.parse(payload)).not.toThrow();
    expect(payload.limit).toBe(20);
    expect(payload.offset).toBe(0);
    expect(payload.total).toBe(1);
    expect(payload.items[0]).toEqual({
      id: rawArtist.id,
      slug: rawArtist.slug,
      displayName: rawArtist.displayName,
      favoriteCount: 7,
      avatarAsset: {
        id: rawArtist.avatarAsset.id,
        kind: 'POSTER',
        status: 'ACTIVE',
        publicUrl: 'https://cdn.example.com/avatar.jpg',
        originalName: 'avatar.jpg',
        contentType: 'image/jpeg',
        sizeBytes: null,
      },
    });
    expect(payload.items[0]).not.toHaveProperty('bio');
    expect(payload.items[0].avatarAsset).not.toHaveProperty('storageKey');
    expect(payload.items[0].avatarAsset).not.toHaveProperty('checksum');
  });
});
