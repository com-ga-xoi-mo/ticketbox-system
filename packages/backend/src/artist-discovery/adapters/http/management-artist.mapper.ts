import type { ManagementArtistResponse } from '@ticketbox/api-types';

export function mapToManagementArtistResponse(artist: any): ManagementArtistResponse {
  return {
    id: artist.id,
    slug: artist.slug,
    displayName: artist.displayName,
    bio: artist.bio ?? null,
    status: artist.status,
    avatarAssetId: artist.avatarAssetId ?? null,
    posterAssetId: artist.posterAssetId ?? null,
    followerCount: artist.followerCount,
    favoriteCount: artist.favoriteCount,
    createdAt: artist.createdAt.toISOString(),
    avatarAsset: artist.avatarAsset
      ? {
          id: artist.avatarAsset.id,
          kind: artist.avatarAsset.kind,
          status: artist.avatarAsset.status,
          publicUrl: artist.avatarAsset.publicUrl,
          originalName: artist.avatarAsset.originalName,
          contentType: artist.avatarAsset.contentType,
          sizeBytes: artist.avatarAsset.sizeBytes,
        }
      : null,
    posterAsset: artist.posterAsset
      ? {
          id: artist.posterAsset.id,
          kind: artist.posterAsset.kind,
          status: artist.posterAsset.status,
          publicUrl: artist.posterAsset.publicUrl,
          originalName: artist.posterAsset.originalName,
          contentType: artist.posterAsset.contentType,
          sizeBytes: artist.posterAsset.sizeBytes,
        }
      : null,
  };
}
