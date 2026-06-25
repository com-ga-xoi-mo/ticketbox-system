import { z } from 'zod';
import { EventTypeCodeSchema, PublicAssetSchema } from '../catalog/public-concert.contract';

export const PublicArtistSummarySchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    displayName: z.string().min(1),
    avatarAsset: PublicAssetSchema.nullable(),
    favoriteCount: z.number().int().nonnegative(),
  })
  .strict();
export type PublicArtistSummary = z.infer<typeof PublicArtistSummarySchema>;

export const PublicArtistTimelineEventSchema = z
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
  })
  .strict();
export type PublicArtistTimelineEvent = z.infer<typeof PublicArtistTimelineEventSchema>;

export const PublicArtistProfileSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    displayName: z.string().min(1),
    bio: z.string().nullable(),
    avatarAsset: PublicAssetSchema.nullable(),
    posterAsset: PublicAssetSchema.nullable(),
    followerCount: z.number().int().nonnegative(),
    favoriteCount: z.number().int().nonnegative(),
    upcomingEvents: z.array(PublicArtistTimelineEventSchema),
    pastEventCount: z.number().int().nonnegative(),
    viewerFollowing: z.boolean().nullable(),
    viewerFavorited: z.boolean().nullable(),
  })
  .strict();
export type PublicArtistProfile = z.infer<typeof PublicArtistProfileSchema>;

export const PublicTopArtistSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    displayName: z.string().min(1),
    avatarAsset: PublicAssetSchema.nullable(),
    favoriteCount: z.number().int().nonnegative(),
  })
  .strict();
export type PublicTopArtist = z.infer<typeof PublicTopArtistSchema>;

export const PublicArtistListResponseSchema = z
  .object({
    items: z.array(PublicArtistSummarySchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .strict();
export type PublicArtistListResponse = z.infer<typeof PublicArtistListResponseSchema>;

export const TopArtistListResponseSchema = z.array(PublicTopArtistSchema);
export type TopArtistListResponse = z.infer<typeof TopArtistListResponseSchema>;

export const ArtistSearchParamsSchema = z
  .object({
    q: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();
export type ArtistSearchParams = z.infer<typeof ArtistSearchParamsSchema>;

export const ArtistFollowResponseSchema = z
  .object({
    artistId: z.string().uuid(),
    following: z.boolean(),
  })
  .strict();
export type ArtistFollowResponse = z.infer<typeof ArtistFollowResponseSchema>;

export const ArtistFavoriteResponseSchema = z
  .object({
    artistId: z.string().uuid(),
    favorited: z.boolean(),
  })
  .strict();
export type ArtistFavoriteResponse = z.infer<typeof ArtistFavoriteResponseSchema>;
