import { z } from 'zod';

export const ArtistBioStatusSchema = z.enum([
  'DRAFT',
  'PROCESSING',
  'READY_FOR_REVIEW',
  'PUBLISHED',
  'FAILED',
  'REJECTED',
]);
export type ArtistBioStatus = z.infer<typeof ArtistBioStatusSchema>;

export const UploadArtistBioPressKitRequestSchema = z
  .object({
    originalName: z.string().trim().min(1).max(240),
    contentType: z.string().trim().min(1).max(160),
    contentBase64: z.string().min(1),
  })
  .strict();
export type UploadArtistBioPressKitRequest = z.infer<typeof UploadArtistBioPressKitRequestSchema>;

const nullableUuid = z.string().uuid().nullable();
const nullableDateTime = z.string().datetime({ offset: true }).nullable();

export const ArtistBioResponseSchema = z
  .object({
    id: z.string().uuid(),
    concertId: z.string().uuid(),
    pressKitAssetId: nullableUuid,
    status: ArtistBioStatusSchema,
    generatedBio: z.string().nullable(),
    publishedBio: z.string().nullable(),
    provider: z.string().nullable(),
    errorMessage: z.string().nullable(),
    retryCount: z.number().int().nonnegative(),
    maxAttempts: z.number().int().positive(),
    lastAttemptedAt: nullableDateTime,
    nextRetryAt: nullableDateTime,
    requestedById: nullableUuid,
    reviewedById: nullableUuid,
    publishedAt: nullableDateTime,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ArtistBioResponse = z.infer<typeof ArtistBioResponseSchema>;
