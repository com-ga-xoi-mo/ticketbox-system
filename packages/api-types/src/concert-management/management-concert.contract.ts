import { z } from 'zod';
import { EventTypeCodeSchema, PublicAssetSchema } from '../catalog/public-concert.contract';
import { ArtistStatusCodeSchema } from '../artist/management-artist.contract';

export const ConcertStatusCodeSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'ENDED']);
export type ConcertStatusCode = z.infer<typeof ConcertStatusCodeSchema>;

export const ManagementLinkedArtistSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  status: ArtistStatusCodeSchema,
  avatarAsset: PublicAssetSchema.nullable(),
  displayOrder: z.number().int().nonnegative(),
}).strict();
export type ManagementLinkedArtist = z.infer<typeof ManagementLinkedArtistSchema>;

/**
 * Paired-coordinate refinement: both lat and lng must be provided together
 * or both must be null/absent. Mixing one with the other is invalid.
 */
function requireCoordinatePair<T extends { latitude?: number | null; longitude?: number | null }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  const hasLat = data.latitude != null;
  const hasLng = data.longitude != null;
  if (hasLat && !hasLng) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'longitude is required when latitude is provided', path: ['longitude'] });
  }
  if (hasLng && !hasLat) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'latitude is required when longitude is provided', path: ['latitude'] });
  }
}

const latitudeField = z.number().min(-90).max(90).nullable().optional();
const longitudeField = z.number().min(-180).max(180).nullable().optional();

export const ManagementConcertResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
  description: z.string().nullable(),
  venueName: z.string().min(1),
  venueAddress: z.string().nullable(),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  status: ConcertStatusCodeSchema,
  eventType: EventTypeCodeSchema,
  isFeatured: z.boolean(),
  displayOrder: z.number().int().nonnegative(),
  resaleEnabled: z.boolean(),
  resaleMaxPricePercent: z.number().int(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  seoImageUrl: z.string().url().startsWith('https://').nullable(),
  createdById: z.string().uuid(),
  posterAssetId: z.string().uuid().nullable(),
  bannerAssetId: z.string().uuid().nullable(),
  seatingMapAssetId: z.string().uuid().nullable(),
  posterAsset: PublicAssetSchema.nullable(),
  bannerAsset: PublicAssetSchema.nullable(),
  artists: z.array(ManagementLinkedArtistSchema),
  ticketTypesCount: z.number().int().nonnegative().optional(),
  seatingZonesCount: z.number().int().nonnegative().optional(),
  checkinStaffCount: z.number().int().nonnegative().optional(),
  seatingMapConfigured: z.boolean().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  cancelledAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
export type ManagementConcertResponse = z.infer<typeof ManagementConcertResponseSchema>;

const OrganizerCreateConcertBaseSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe'),
  title: z.string().min(1),
  artistName: z.string().min(1),
  venueName: z.string().min(1),
  venueAddress: z.string().optional(),
  city: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  description: z.string().optional(),
  eventType: EventTypeCodeSchema.optional(),
  resaleEnabled: z.boolean().optional(),
  resaleMaxPricePercent: z.number().int().min(100).max(200).optional(),
  latitude: latitudeField,
  longitude: longitudeField,
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoImageUrl: z.string().url().startsWith('https://').nullable().optional(),
}).strict();

export const OrganizerCreateConcertSchema = OrganizerCreateConcertBaseSchema.superRefine(requireCoordinatePair);
export type OrganizerCreateConcert = z.infer<typeof OrganizerCreateConcertSchema>;

const OrganizerUpdateConcertBaseSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe').optional(),
  title: z.string().min(1).optional(),
  artistName: z.string().min(1).optional(),
  venueName: z.string().min(1).optional(),
  venueAddress: z.string().optional(),
  city: z.string().min(1).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  description: z.string().optional(),
  eventType: EventTypeCodeSchema.optional(),
  resaleEnabled: z.boolean().optional(),
  resaleMaxPricePercent: z.number().int().min(100).max(200).optional(),
  latitude: latitudeField,
  longitude: longitudeField,
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoImageUrl: z.string().url().startsWith('https://').nullable().optional(),
}).strict();

export const OrganizerUpdateConcertSchema = OrganizerUpdateConcertBaseSchema.superRefine(requireCoordinatePair);
export type OrganizerUpdateConcert = z.infer<typeof OrganizerUpdateConcertSchema>;

export const AdminUpdateConcertSchema = OrganizerUpdateConcertBaseSchema.extend({
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
}).strict().superRefine(requireCoordinatePair);
export type AdminUpdateConcert = z.infer<typeof AdminUpdateConcertSchema>;
