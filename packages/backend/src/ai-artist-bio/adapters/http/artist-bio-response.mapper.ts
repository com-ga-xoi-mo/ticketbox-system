import type { ArtistBioRecord } from '../../domain/artist-bio.types';

export function toArtistBioResponse(record: ArtistBioRecord) {
  return {
    id: record.id,
    concertId: record.concertId,
    pressKitAssetId: record.pressKitAssetId,
    status: record.status,
    generatedBio: record.generatedBio,
    publishedBio: record.publishedBio,
    provider: record.provider,
    errorMessage: record.errorMessage,
    retryCount: record.retryCount,
    maxAttempts: record.maxAttempts,
    lastAttemptedAt: record.lastAttemptedAt,
    nextRetryAt: record.nextRetryAt,
    requestedById: record.requestedById,
    reviewedById: record.reviewedById,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

