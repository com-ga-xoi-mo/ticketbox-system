import type { PublicArtistSummary } from '@ticketbox/api-types';

export function mapToPublicArtistSummary(artist: any): PublicArtistSummary {
  return {
    id: artist.id,
    slug: artist.slug,
    displayName: artist.displayName,
    favoriteCount: artist.favoriteCount,
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
  };
}
