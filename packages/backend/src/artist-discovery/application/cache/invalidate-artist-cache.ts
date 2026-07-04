import { Logger } from '@nestjs/common';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import { ConcertCacheKeys } from '../../../concert-management/application/cache/concert-cache-keys';

export async function invalidateArtistAndConcertCache(cache: CacheServicePort, logger: Logger): Promise<void> {
  try {
    await Promise.all([
      cache.delByPrefix('artist:'),
      cache.delByPrefix(ConcertCacheKeys.NAMESPACE_PREFIX),
    ]);
  } catch (err) {
    logger.warn('Failed to invalidate artist/concert caches, relying on TTL fallback', err);
  }
}
