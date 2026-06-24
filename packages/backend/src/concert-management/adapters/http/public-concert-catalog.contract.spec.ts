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
      totalAvailableQuantity: 120,
      minPriceVnd: 450000,
      maxPriceVnd: 1250000,
      ticketTypeCount: 2,
    },
  };

  const detail = {
    ...summary,
    description: 'A summer concert.',
    publishedArtistBio: 'The Suns are a live act.',
    venueAddress: '1 Nguyen Hue',
    seatingMapAsset: { ...posterAsset, kind: 'SEATING_MAP' },
    seatingZones: [
      {
        id: seatingZoneId,
        svgElementId: 'zone-ga',
        label: 'GA',
        color: '#00aaff',
        displayOrder: 1,
        status: 'ACTIVE',
      },
    ],
    ticketTypes: [
      {
        id: ticketTypeId,
        code: 'GA',
        name: 'General Admission',
        description: 'Standing zone',
        priceVnd: 450000,
        totalQuantity: 200,
        availableQuantity: 120,
        maxPerUser: 4,
        saleStartsAt,
        saleEndsAt,
        status: 'ACTIVE',
        zoneIds: [seatingZoneId],
      },
    ],
    ticketTypeZoneMappings: [{ ticketTypeId, seatingZoneId }],
  };

  const availability = {
    concertId,
    slug: 'summer-beats',
    generatedAt: new Date('2026-06-01T12:00:00.000Z'),
    ticketTypes: [
      {
        ticketTypeId,
        code: 'GA',
        name: 'General Admission',
        totalQuantity: 200,
        availableQuantity: 120,
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
    { execute: vi.fn().mockResolvedValue(availability) } as any,
  );

  it('returns a public list response compatible with the shared schema', async () => {
    const payload = toHttpPayload(await controller.listConcerts());
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
