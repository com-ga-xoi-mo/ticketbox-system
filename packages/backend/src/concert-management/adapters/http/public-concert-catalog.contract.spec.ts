import {
  PublicConcertAvailabilityResponseSchema,
  PublicConcertDetailResponseSchema,
  PublicConcertListResponseSchema,
} from '@ticketbox/api-types';
import { describe, expect, it, vi } from 'vitest';

import { PublicConcertCatalogController } from './public-concert-catalog.controller';

const concertId = '22222222-2222-4222-8222-222222222222';
const assetId = '55555555-5555-4555-8555-555555555555';
const seatingZoneId = '66666666-6666-4666-8666-666666666666';
const ticketTypeId = '77777777-7777-4777-8777-777777777777';
const startsAt = new Date('2026-07-01T12:00:00.000Z');
const endsAt = new Date('2026-07-01T15:00:00.000Z');
const saleStartsAt = new Date('2026-06-01T12:00:00.000Z');
const saleEndsAt = new Date('2026-06-30T12:00:00.000Z');

function toHttpPayload(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('public concert catalog HTTP contracts', () => {
  const posterAsset = {
    id: assetId,
    kind: 'POSTER',
    status: 'ACTIVE',
    publicUrl: 'https://cdn.ticketbox.test/poster.jpg',
    originalName: 'poster.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 2048,
  };

  const summary = {
    id: concertId,
    slug: 'summer-beats',
    title: 'Summer Beats',
    artistName: 'The Suns',
    venueName: 'TicketBox Arena',
    city: 'Ho Chi Minh City',
    startsAt,
    endsAt,
    posterAsset,
    availabilitySummary: {
      totalAvailableQuantity: 100,
      minPriceVnd: 500000,
      maxPriceVnd: 1500000,
      ticketTypeCount: 2,
    },
  };

  const detail = {
    ...summary,
    description: 'A great summer concert',
    publishedArtistBio: 'The Suns are a jazz band',
    venueAddress: '123 Main St',
    seatingMapAsset: null,
    seatingZones: [
      {
        id: seatingZoneId,
        svgElementId: 'zone-a',
        label: 'VIP',
        color: '#ff0000',
        displayOrder: 1,
        status: 'ACTIVE',
      },
    ],
    ticketTypes: [
      {
        id: ticketTypeId,
        code: 'VIP',
        name: 'VIP Ticket',
        description: 'Best seats',
        priceVnd: 1500000,
        totalQuantity: 50,
        availableQuantity: 50,
        maxPerUser: 4,
        saleStartsAt,
        saleEndsAt,
        status: 'ACTIVE',
        zoneIds: [seatingZoneId],
      },
    ],
    ticketTypeZoneMappings: [
      {
        ticketTypeId,
        seatingZoneId,
      },
    ],
  };

  const availabilitySnapshot = {
    concertId,
    slug: 'summer-beats',
    generatedAt: new Date(),
    ticketTypes: [
      {
        ticketTypeId,
        code: 'VIP',
        name: 'VIP Ticket',
        totalQuantity: 50,
        availableQuantity: 50,
        status: 'ACTIVE',
        saleStartsAt,
        saleEndsAt,
        zoneIds: [seatingZoneId],
      },
    ],
  };

  const controller = new PublicConcertCatalogController(
    { execute: vi.fn().mockResolvedValue([summary]) } as any,
    { execute: vi.fn().mockResolvedValue(detail) } as any,
    { execute: vi.fn().mockResolvedValue(availabilitySnapshot) } as any,
    { execute: vi.fn().mockResolvedValue(['Ho Chi Minh City']) } as any,
  );

  it('returns a public list response compatible with the shared schema', async () => {
    const payload = toHttpPayload(await controller.listConcerts({}));
    expect(PublicConcertListResponseSchema.parse(payload)).toEqual(payload);
  });

  it('returns a public detail response compatible with the shared schema', async () => {
    const payload = toHttpPayload(await controller.getConcertDetail('summer-beats'));
    expect(PublicConcertDetailResponseSchema.parse(payload)).toEqual(payload);
  });

  it('returns a public availability response compatible with the shared schema', async () => {
    const payload = toHttpPayload(await controller.getAvailability('summer-beats'));
    expect(PublicConcertAvailabilityResponseSchema.parse(payload)).toEqual(payload);
  });
});
