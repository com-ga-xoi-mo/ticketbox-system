import { describe, it, expect } from 'vitest';
import {
  OrganizerCreateConcertSchema,
  OrganizerUpdateConcertSchema,
  AdminUpdateConcertSchema,
  ManagementConcertResponseSchema,
} from './concert-management/management-concert.contract';
import { PublicConcertDetailResponseSchema } from './catalog/public-concert.contract';
import {
  LocationSearchQuerySchema,
  LocationSearchResultSchema,
  LocationSearchResponseSchema,
} from './location/location-search.contract';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------
const baseCreate = {
  slug: 'test-concert',
  title: 'Test Concert',
  artistName: 'Artist',
  venueName: 'Venue',
  city: 'Hanoi',
  startsAt: '2026-08-01T18:00:00.000Z',
  endsAt: '2026-08-01T22:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Concert coordinate validation — create schema
// ---------------------------------------------------------------------------
describe('OrganizerCreateConcertSchema coordinate validation', () => {
  it('accepts valid coordinate pair', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: 10.776, longitude: 106.7 })
        .success,
    ).toBe(true);
  });

  it('accepts omitted coordinates (both absent → null pair)', () => {
    expect(OrganizerCreateConcertSchema.safeParse({ ...baseCreate }).success).toBe(true);
  });

  it('accepts both coordinates explicitly null', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: null, longitude: null })
        .success,
    ).toBe(true);
  });

  it('rejects only latitude provided', () => {
    const result = OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: 10.776 });
    expect(result.success).toBe(false);
  });

  it('rejects only longitude provided', () => {
    const result = OrganizerCreateConcertSchema.safeParse({ ...baseCreate, longitude: 106.7 });
    expect(result.success).toBe(false);
  });

  it('rejects latitude out of range (> 90)', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: 91, longitude: 106.7 })
        .success,
    ).toBe(false);
  });

  it('rejects latitude out of range (< -90)', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: -91, longitude: 106.7 })
        .success,
    ).toBe(false);
  });

  it('rejects longitude out of range (> 180)', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: 10.776, longitude: 181 })
        .success,
    ).toBe(false);
  });

  it('rejects longitude out of range (< -180)', () => {
    expect(
      OrganizerCreateConcertSchema.safeParse({ ...baseCreate, latitude: 10.776, longitude: -181 })
        .success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Concert coordinate validation — update schema
// ---------------------------------------------------------------------------
describe('OrganizerUpdateConcertSchema coordinate validation', () => {
  it('omitting both coordinates is valid (preserves existing on server)', () => {
    const result = OrganizerUpdateConcertSchema.safeParse({ title: 'New Title' });
    expect(result.success).toBe(true);
    // Both should be absent (undefined) — not defaulted to null
    expect(result.data).not.toHaveProperty('latitude');
    expect(result.data).not.toHaveProperty('longitude');
  });

  it('accepts clearing coordinates (both null)', () => {
    expect(
      OrganizerUpdateConcertSchema.safeParse({ latitude: null, longitude: null }).success,
    ).toBe(true);
  });

  it('accepts updating coordinates with a valid pair', () => {
    expect(
      OrganizerUpdateConcertSchema.safeParse({ latitude: 21.02, longitude: 105.84 }).success,
    ).toBe(true);
  });

  it('rejects only latitude in update', () => {
    expect(OrganizerUpdateConcertSchema.safeParse({ latitude: 21.02 }).success).toBe(false);
  });

  it('rejects only longitude in update', () => {
    expect(OrganizerUpdateConcertSchema.safeParse({ longitude: 105.84 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AdminUpdateConcertSchema
// ---------------------------------------------------------------------------
describe('AdminUpdateConcertSchema coordinate validation', () => {
  it('accepts coordinate pair with moderation fields', () => {
    expect(
      AdminUpdateConcertSchema.safeParse({
        latitude: 10.776,
        longitude: 106.7,
        isFeatured: true,
        displayOrder: 1,
      }).success,
    ).toBe(true);
  });

  it('rejects only latitude', () => {
    expect(AdminUpdateConcertSchema.safeParse({ latitude: 10.776 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ManagementConcertResponseSchema — coordinates required nullable
// ---------------------------------------------------------------------------
describe('ManagementConcertResponseSchema coordinate fields', () => {
  const baseResponse = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'test',
    title: 'Test',
    artistName: 'Artist',
    description: null,
    venueName: 'Venue',
    venueAddress: null,
    city: 'Hanoi',
    latitude: null,
    longitude: null,
    startsAt: '2026-08-01T18:00:00.000Z',
    endsAt: '2026-08-01T22:00:00.000Z',
    status: 'PUBLISHED' as const,
    eventType: 'CONCERT' as const,
    isFeatured: false,
    displayOrder: 0,
    resaleEnabled: false,
    resaleMaxPricePercent: 120,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    createdById: '22222222-2222-4222-8222-222222222222',
    posterAssetId: null,
    bannerAssetId: null,
    seatingMapAssetId: null,
    posterAsset: null,
    bannerAsset: null,
    artists: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: null,
    cancelledAt: null,
  };

  it('accepts null coordinates', () => {
    expect(ManagementConcertResponseSchema.safeParse(baseResponse).success).toBe(true);
  });

  it('accepts non-null coordinate pair', () => {
    expect(
      ManagementConcertResponseSchema.safeParse({
        ...baseResponse,
        latitude: 10.776,
        longitude: 106.7,
      }).success,
    ).toBe(true);
  });

  it('rejects missing latitude field', () => {
    const { latitude: _lat, ...withoutLat } = baseResponse;
    expect(ManagementConcertResponseSchema.safeParse(withoutLat).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Location search query schema
// ---------------------------------------------------------------------------
describe('LocationSearchQuerySchema', () => {
  it('accepts a valid query and trims it', () => {
    const result = LocationSearchQuerySchema.safeParse({ q: '  Hà Nội  ' });
    expect(result.success).toBe(true);
    expect(result.data?.q).toBe('Hà Nội');
  });

  it('accepts a 3-character query', () => {
    expect(LocationSearchQuerySchema.safeParse({ q: 'abc' }).success).toBe(true);
  });

  it('rejects a query shorter than 3 characters after trimming', () => {
    expect(LocationSearchQuerySchema.safeParse({ q: '  ab  ' }).success).toBe(false);
  });

  it('rejects a query longer than 200 characters', () => {
    expect(LocationSearchQuerySchema.safeParse({ q: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects missing q parameter', () => {
    expect(LocationSearchQuerySchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown query fields', () => {
    expect(LocationSearchQuerySchema.safeParse({ q: 'test venue', extra: 'field' }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Location search response schema
// ---------------------------------------------------------------------------
describe('LocationSearchResponseSchema', () => {
  const validResult = { displayName: 'Nhà hát Thành phố', latitude: 10.776, longitude: 106.703 };

  it('accepts a valid response with results', () => {
    expect(LocationSearchResponseSchema.safeParse({ results: [validResult] }).success).toBe(true);
  });

  it('accepts empty results array', () => {
    expect(LocationSearchResponseSchema.safeParse({ results: [] }).success).toBe(true);
  });

  it('accepts up to 5 results', () => {
    const results = Array(5).fill(validResult);
    expect(LocationSearchResponseSchema.safeParse({ results }).success).toBe(true);
  });

  it('rejects more than 5 results', () => {
    const results = Array(6).fill(validResult);
    expect(LocationSearchResponseSchema.safeParse({ results }).success).toBe(false);
  });

  it('rejects result with missing displayName', () => {
    expect(
      LocationSearchResultSchema.safeParse({ latitude: 10.776, longitude: 106.703 }).success,
    ).toBe(false);
  });

  it('rejects result with out-of-range latitude', () => {
    expect(
      LocationSearchResultSchema.safeParse({ displayName: 'X', latitude: 91, longitude: 106.703 })
        .success,
    ).toBe(false);
  });

  it('rejects result with out-of-range longitude', () => {
    expect(
      LocationSearchResultSchema.safeParse({ displayName: 'X', latitude: 10.776, longitude: 181 })
        .success,
    ).toBe(false);
  });

  it('rejects non-finite coordinates', () => {
    expect(
      LocationSearchResultSchema.safeParse({
        displayName: 'X',
        latitude: Infinity,
        longitude: 106.703,
      }).success,
    ).toBe(false);
    expect(
      LocationSearchResultSchema.safeParse({ displayName: 'X', latitude: 10.776, longitude: NaN })
        .success,
    ).toBe(false);
  });
});
