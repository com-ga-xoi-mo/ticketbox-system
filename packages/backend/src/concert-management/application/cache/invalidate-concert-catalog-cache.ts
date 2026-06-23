import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import { ConcertCacheKeys } from './concert-cache-keys';

/**
 * Flushes the entire concert catalog cache namespace with a single SCAN pass.
 * Clears: concert:list, concert:detail:{slug}, concert:availability:{slug}.
 *
 * Called from write decorators after any successful admin write.
 */
export async function invalidateConcertCatalogCache(cache: CacheServicePort): Promise<void> {
  await cache.delByPrefix(ConcertCacheKeys.NAMESPACE_PREFIX);
}
