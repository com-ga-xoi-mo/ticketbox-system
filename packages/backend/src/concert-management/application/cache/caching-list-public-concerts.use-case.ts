import type { CatalogSearchFilters, ConcertSummary } from '../../domain/catalog.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { ListPublicConcertsUseCase } from '../use-cases/list-public-concerts.use-case';
import { ConcertCacheKeys } from './concert-cache-keys';

const TTL_SECONDS = 60;

/**
 * Decorator (same interface as `ListPublicConcertsUseCase`) that wraps the real
 * use-case with a cache layer. The provider token `ListPublicConcertsUseCase`
 * is preserved so controllers need no change.
 *
 * Date fields round-trip as ISO strings — the HTTP layer already serializes
 * both live and cached responses identically.
 */
export class CachingListPublicConcertsUseCase {
  constructor(
    private readonly inner: ListPublicConcertsUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(now = new Date(), filters?: CatalogSearchFilters): Promise<ConcertSummary[]> {
    // Determine a cache key based on filters if present.
    let key = ConcertCacheKeys.list();
    if (filters && Object.keys(filters).length > 0) {
      // Serialize filters deterministically for cache key
      const filterKey = JSON.stringify(filters, Object.keys(filters).sort());
      key = `${key}:filtered:${Buffer.from(filterKey).toString('base64')}`;
    }

    return this.cache.getOrSet(
      key,
      TTL_SECONDS,
      () => this.inner.execute(now, filters),
    );
  }
}
