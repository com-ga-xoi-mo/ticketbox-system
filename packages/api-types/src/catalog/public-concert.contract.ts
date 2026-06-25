import { z } from 'zod';

export const EventTypeCodeSchema = z.enum([
  'CONCERT',
  'WORKSHOP',
  'SPORT',
  'MOVIE',
  'THEATRE',
  'VOUCHER',
]);
export type EventTypeCode = z.infer<typeof EventTypeCodeSchema>;

export const AssetKindCodeSchema = z.enum([
  'POSTER',
  'SEATING_MAP',
  'PRESS_KIT',
  'GUEST_LIST_CSV',
  'QR_IMAGE',
  'ARTIST_AVATAR',
  'ARTIST_POSTER',
  'OTHER',
]);
export type AssetKindCode = z.infer<typeof AssetKindCodeSchema>;

export const AssetStatusCodeSchema = z.enum(['ACTIVE', 'REJECTED', 'ARCHIVED']);
export type AssetStatusCode = z.infer<typeof AssetStatusCodeSchema>;

export const SeatingZoneStatusCodeSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type SeatingZoneStatusCode = z.infer<typeof SeatingZoneStatusCodeSchema>;

export const TicketTypeStatusCodeSchema = z.enum(['ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED']);
export type TicketTypeStatusCode = z.infer<typeof TicketTypeStatusCodeSchema>;

export const PublicAssetSchema = z
  .object({
    id: z.string().uuid(),
    kind: AssetKindCodeSchema,
    status: AssetStatusCodeSchema,
    publicUrl: z.string().min(1).nullable(),
    originalName: z.string().min(1).nullable(),
    contentType: z.string().min(1).nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type PublicAsset = z.infer<typeof PublicAssetSchema>;

export const PublicConcertArtistSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    displayName: z.string().min(1),
    avatarAsset: PublicAssetSchema.nullable(),
  })
  .strict();
export type PublicConcertArtist = z.infer<typeof PublicConcertArtistSchema>;

export const PublicConcertAvailabilitySummarySchema = z
  .object({
    totalAvailableQuantity: z.number().int().nonnegative(),
    minPriceVnd: z.number().int().nonnegative().nullable(),
    maxPriceVnd: z.number().int().nonnegative().nullable(),
    ticketTypeCount: z.number().int().nonnegative(),
  })
  .strict();
export type PublicConcertAvailabilitySummary = z.infer<
  typeof PublicConcertAvailabilitySummarySchema
>;

export const PublicConcertSummarySchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    title: z.string().min(1),
    artistName: z.string().min(1),
    venueName: z.string().min(1),
    city: z.string().min(1),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    eventType: EventTypeCodeSchema,
    posterAsset: PublicAssetSchema.nullable(),
    availabilitySummary: PublicConcertAvailabilitySummarySchema,
    artists: z.array(PublicConcertArtistSchema).default([]),
  })
  .strict();
export type PublicConcertSummary = z.infer<typeof PublicConcertSummarySchema>;

export const PublicFeaturedConcertSchema = PublicConcertSummarySchema.extend({
  bannerAsset: PublicAssetSchema.nullable(),
  displayOrder: z.number().int(),
}).strict();
export type PublicFeaturedConcert = z.infer<typeof PublicFeaturedConcertSchema>;

export const PublicFeaturedConcertListResponseSchema = z.array(PublicFeaturedConcertSchema);
export type PublicFeaturedConcertListResponse = z.infer<typeof PublicFeaturedConcertListResponseSchema>;

export const PublicConcertListResponseSchema = z.array(PublicConcertSummarySchema);
export type PublicConcertListResponse = z.infer<typeof PublicConcertListResponseSchema>;

export const PublicSeatingZoneSchema = z
  .object({
    id: z.string().uuid(),
    svgElementId: z.string().min(1),
    label: z.string().min(1),
    color: z.string().min(1).nullable(),
    displayOrder: z.number().int(),
    status: SeatingZoneStatusCodeSchema,
  })
  .strict();
export type PublicSeatingZone = z.infer<typeof PublicSeatingZoneSchema>;

export const PublicTicketTypeSchema = z
  .object({
    id: z.string().uuid(),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1).nullable(),
    priceVnd: z.number().int().nonnegative(),
    totalQuantity: z.number().int().nonnegative(),
    availableQuantity: z.number().int().nonnegative(),
    maxPerUser: z.number().int().positive(),
    saleStartsAt: z.string().datetime({ offset: true }),
    saleEndsAt: z.string().datetime({ offset: true }),
    status: TicketTypeStatusCodeSchema,
    zoneIds: z.array(z.string().uuid()),
  })
  .strict();
export type PublicTicketType = z.infer<typeof PublicTicketTypeSchema>;

export const PublicTicketTypeZoneMappingSchema = z
  .object({
    ticketTypeId: z.string().uuid(),
    seatingZoneId: z.string().uuid(),
  })
  .strict();
export type PublicTicketTypeZoneMapping = z.infer<typeof PublicTicketTypeZoneMappingSchema>;

export const PublicConcertDetailResponseSchema = PublicConcertSummarySchema.extend({
  description: z.string().min(1).nullable(),
  publishedArtistBio: z.string().min(1).nullable(),
  venueAddress: z.string().min(1).nullable(),
  seatingMapAsset: PublicAssetSchema.nullable(),
  seoTitle: z.string().min(1).nullable(),
  seoDescription: z.string().min(1).nullable(),
  seoImageUrl: z.string().min(1).nullable(),
  seatingZones: z.array(PublicSeatingZoneSchema),
  ticketTypes: z.array(PublicTicketTypeSchema),
  ticketTypeZoneMappings: z.array(PublicTicketTypeZoneMappingSchema),
  artists: z.array(PublicConcertArtistSchema).default([]),
}).strict();
export type PublicConcertDetailResponse = z.infer<typeof PublicConcertDetailResponseSchema>;

export const PublicAvailabilityTicketTypeSchema = z
  .object({
    ticketTypeId: z.string().uuid(),
    code: z.string().min(1),
    name: z.string().min(1),
    totalQuantity: z.number().int().nonnegative(),
    availableQuantity: z.number().int().nonnegative(),
    status: TicketTypeStatusCodeSchema,
    saleStartsAt: z.string().datetime({ offset: true }),
    saleEndsAt: z.string().datetime({ offset: true }),
    zoneIds: z.array(z.string().uuid()),
  })
  .strict();
export type PublicAvailabilityTicketType = z.infer<typeof PublicAvailabilityTicketTypeSchema>;

export const PublicConcertAvailabilityResponseSchema = z
  .object({
    concertId: z.string().uuid(),
    slug: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    ticketTypes: z.array(PublicAvailabilityTicketTypeSchema),
  })
  .strict();
export type PublicConcertAvailabilityResponse = z.infer<
  typeof PublicConcertAvailabilityResponseSchema
>;

export const CatalogSortBySchema = z.enum(['date', 'price']);
export type CatalogSortBy = z.infer<typeof CatalogSortBySchema>;

export const CatalogSortDirSchema = z.enum(['asc', 'desc']);
export type CatalogSortDir = z.infer<typeof CatalogSortDirSchema>;

export const CatalogSearchParamsSchema = z
  .object({
    q: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateTo: z.string().datetime({ offset: true }).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    eventType: EventTypeCodeSchema.optional(),
    sortBy: CatalogSortBySchema.optional(),
    sortDir: CatalogSortDirSchema.optional(),
  })
  .strict();
export type CatalogSearchParams = z.infer<typeof CatalogSearchParamsSchema>;

export const FeaturedConcertParamsSchema = z
  .object({
    limit: z.coerce.number().int().positive().optional(),
  })
  .strict();
export type FeaturedConcertParams = z.infer<typeof FeaturedConcertParamsSchema>;

export const PublicConcertCitiesResponseSchema = z.array(z.string());
export type PublicConcertCitiesResponse = z.infer<typeof PublicConcertCitiesResponseSchema>;
