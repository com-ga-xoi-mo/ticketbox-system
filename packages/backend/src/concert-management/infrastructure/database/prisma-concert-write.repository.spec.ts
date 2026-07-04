import { describe, expect, it, vi } from 'vitest';

import { PrismaConcertWriteRepository } from './prisma-concert-write.repository';

const posterAsset = {
  id: 'poster-id',
  kind: 'POSTER',
  status: 'ACTIVE',
  publicUrl: 'https://images.example.com/poster.jpg',
  originalName: 'poster.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 123,
};

const concertRecord = {
  id: 'concert-id',
  slug: 'concert',
  title: 'Concert',
  artistName: 'Artist',
  description: null,
  venueName: 'Venue',
  venueAddress: null,
  city: 'City',
  startsAt: new Date('2026-08-01T12:00:00.000Z'),
  endsAt: new Date('2026-08-01T14:00:00.000Z'),
  status: 'PUBLISHED',
  createdById: 'organizer-id',
  posterAssetId: posterAsset.id,
  posterAsset,
  seatingMapAssetId: null,
  publishedAt: new Date('2026-07-01T00:00:00.000Z'),
  cancelledAt: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  _count: { ticketTypes: 1, seatingZones: 2, checkinStaff: 3 },
};

describe('PrismaConcertWriteRepository protected reads', () => {
  it('returns safe poster metadata for admin concert lists', async () => {
    const findMany = vi.fn().mockResolvedValue([concertRecord]);
    const repository = new PrismaConcertWriteRepository({ concert: { findMany } } as any);

    const result = await repository.findAllConcerts();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ posterAsset: true }),
    }));
    expect(result[0]).toMatchObject({ posterAssetId: 'poster-id', posterAsset });
    expect(result[0]?.posterAsset).not.toHaveProperty('storageKey');
    expect(result[0]?.posterAsset).not.toHaveProperty('checksum');
  });

  it('returns the same poster metadata for organizer-owned lists', async () => {
    const findMany = vi.fn().mockResolvedValue([concertRecord]);
    const repository = new PrismaConcertWriteRepository({ concert: { findMany } } as any);

    const result = await repository.findConcertsByOwner('organizer-id');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdById: 'organizer-id' },
      include: expect.objectContaining({ posterAsset: true }),
    }));
    expect(result[0]?.posterAsset?.publicUrl).toBe('https://images.example.com/poster.jpg');
  });
});
