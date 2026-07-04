import { z } from 'zod';
import { PublicAssetSchema } from '../catalog/public-concert.contract';

export const ArtistStatusCodeSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type ArtistStatusCode = z.infer<typeof ArtistStatusCodeSchema>;

export const ManagementArtistResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().nullable(),
  status: ArtistStatusCodeSchema,
  avatarAssetId: z.string().uuid().nullable(),
  posterAssetId: z.string().uuid().nullable(),
  followerCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  avatarAsset: PublicAssetSchema.nullable(),
  posterAsset: PublicAssetSchema.nullable(),
}).strict();
export type ManagementArtistResponse = z.infer<typeof ManagementArtistResponseSchema>;

export const AdminArtistSearchParamsSchema = z.object({
  q: z.string().min(1).optional(),
  status: ArtistStatusCodeSchema.optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
}).strict();
export type AdminArtistSearchParams = z.infer<typeof AdminArtistSearchParamsSchema>;

export const AdminArtistListResponseSchema = z.object({
  items: z.array(ManagementArtistResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
}).strict();
export type AdminArtistListResponse = z.infer<typeof AdminArtistListResponseSchema>;

export const AdminCreateArtistSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe'),
  displayName: z.string().min(1),
  bio: z.string().optional(),
  status: ArtistStatusCodeSchema.default('ACTIVE'),
}).strict();
export type AdminCreateArtist = z.infer<typeof AdminCreateArtistSchema>;

export const AdminUpdateArtistSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe').optional(),
  displayName: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  status: ArtistStatusCodeSchema.optional(),
}).strict();
export type AdminUpdateArtist = z.infer<typeof AdminUpdateArtistSchema>;

export const UploadArtistAssetResponseSchema = z.object({
  assetId: z.string().uuid(),
  publicUrl: z.string().url().nullable(),
}).strict();
export type UploadArtistAssetResponse = z.infer<typeof UploadArtistAssetResponseSchema>;
