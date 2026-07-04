import { getAssetUrl, resolveImageUrl } from '../../shared/api/client';
import type { Concert } from './types';

export function resolveConcertPosterUrl(concert: Pick<Concert, 'posterAsset' | 'posterAssetId'>): string | null {
  if (concert.posterAsset?.publicUrl) {
    return resolveImageUrl(concert.posterAsset.publicUrl) ?? null;
  }

  return concert.posterAssetId ? getAssetUrl(concert.posterAssetId) : null;
}
