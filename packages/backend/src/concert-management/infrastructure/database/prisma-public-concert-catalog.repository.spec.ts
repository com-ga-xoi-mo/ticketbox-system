import { ArtistBioStatus, ConcertStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaPublicConcertCatalogRepository } from './prisma-public-concert-catalog.repository';

const now = new Date('2026-06-15T00:00:00.000Z');
const startsAt = new Date('2026-07-15T13:00:00.000Z');
const endsAt = new Date('2026-07-15T16:00:00.000Z');
const saleStartsAt = new Date('2026-06-14T13:00:00.000Z');
const saleEndsAt = new Date('2026-10-13T13:00:00.000Z');

function createRepositoryWithConcertApi(concertApi: unknown): PrismaPublicConcertCatalogRepository {
  return new PrismaPublicConcertCatalogRepository({
    concert: concertApi,
  } as unknown as PrismaService);
}

function sampleConcert() {
  return {
    id: 'concert-1',
    slug: 'anh-trai-say-hi-2026',
    title: 'Anh Trai Say Hi Live Concert',
    artistName: 'Anh Trai Say Hi',
    description: 'Demo concert',
    venueName: 'San van dong My Dinh',
    venueAddress: 'Le Duc Tho, Nam Tu Liem',
    city: 'Ha Noi',
    startsAt,
    endsAt,
    posterAsset: {
      id: 'poster-1',
      kind: 'POSTER',
      status: 'ACTIVE',
      publicUrl: '/storage/poster.jpg',
      originalName: 'poster.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100,
    },
    seatingMapAsset: {
      id: 'map-1',
      kind: 'SEATING_MAP',
      status: 'ACTIVE',
      publicUrl: '/storage/map.svg',
      originalName: 'map.svg',
      contentType: 'image/svg+xml',
      sizeBytes: 200,
    },
    seatingZones: [
      {
        id: 'zone-1',
        concertId: 'concert-1',
        svgElementId: 'zone-svip',
        label: 'SVIP',
        color: '#E11D48',
        displayOrder: 1,
        status: 'ACTIVE',
      },
    ],
    artistBios: [],
    ticketTypes: [
      {
        id: 'ticket-type-1',
        concertId: 'concert-1',
        code: 'SVIP',
        name: 'SVIP',
        description: 'Premium seats',
        priceVnd: 4500000,
        totalQuantity: 200,
        reservedQuantity: 25,
        soldQuantity: 50,
        maxPerUser: 2,
        saleStartsAt,
        saleEndsAt,
        status: 'ACTIVE',
        zones: [
          {
            ticketTypeId: 'ticket-type-1',
            seatingZoneId: 'zone-1',
            concertId: 'concert-1',
          },
          {
            ticketTypeId: 'ticket-type-1',
            seatingZoneId: 'foreign-zone',
            concertId: 'other-concert',
          },
        ],
      },
    ],
  };
}

describe('PrismaPublicConcertCatalogRepository', () => {
  it('filters list queries to upcoming published concerts ordered by start time', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createRepositoryWithConcertApi({ findMany });

    await repository.listUpcomingPublished(now);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ConcertStatus.PUBLISHED,
          startsAt: { gte: now },
        },
        orderBy: { startsAt: 'asc' },
      }),
    );
  });

  it('maps concert detail without leaking internal inventory counters', async () => {
    const findFirst = vi.fn().mockResolvedValue(sampleConcert());
    const repository = createRepositoryWithConcertApi({ findFirst });

    const detail = await repository.findPublishedUpcomingDetailBySlug('anh-trai-say-hi-2026', now);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ConcertStatus.PUBLISHED,
          startsAt: { gte: now },
          slug: 'anh-trai-say-hi-2026',
        },
        include: expect.objectContaining({
          artistBios: {
            where: {
              status: ArtistBioStatus.PUBLISHED,
              publishedBio: {
                not: null,
              },
            },
            orderBy: { publishedAt: 'desc' },
            take: 1,
            select: {
              publishedBio: true,
            },
          },
        }),
      }),
    );
    expect(detail?.ticketTypes[0]).toMatchObject({
      id: 'ticket-type-1',
      availableQuantity: 125,
      zoneIds: ['zone-1'],
    });
    expect(detail?.ticketTypeZoneMappings).toEqual([
      { ticketTypeId: 'ticket-type-1', seatingZoneId: 'zone-1' },
    ]);
    expect('reservedQuantity' in detail!.ticketTypes[0]).toBe(false);
    expect('soldQuantity' in detail!.ticketTypes[0]).toBe(false);
    expect(detail?.publishedArtistBio).toBeNull();
  });

  it('exposes only the latest published artist bio on public concert detail', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      ...sampleConcert(),
      artistBios: [{ publishedBio: 'Approved public artist biography' }],
    });
    const repository = createRepositoryWithConcertApi({ findFirst });

    const detail = await repository.findPublishedUpcomingDetailBySlug('anh-trai-say-hi-2026', now);

    expect(detail?.publishedArtistBio).toBe('Approved public artist biography');
  });

  it('returns compact availability snapshots for public concerts', async () => {
    const findFirst = vi.fn().mockResolvedValue(sampleConcert());
    const repository = createRepositoryWithConcertApi({ findFirst });

    const snapshot = await repository.findPublishedUpcomingAvailabilityBySlug(
      'anh-trai-say-hi-2026',
      now,
    );

    expect(snapshot).toMatchObject({
      concertId: 'concert-1',
      slug: 'anh-trai-say-hi-2026',
      ticketTypes: [
        {
          ticketTypeId: 'ticket-type-1',
          code: 'SVIP',
          availableQuantity: 125,
          zoneIds: ['zone-1'],
        },
      ],
    });
  });

  it('returns null when a public detail query finds no matching concert', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createRepositoryWithConcertApi({ findFirst });

    await expect(repository.findPublishedUpcomingDetailBySlug('missing', now)).resolves.toBeNull();
  });
});
