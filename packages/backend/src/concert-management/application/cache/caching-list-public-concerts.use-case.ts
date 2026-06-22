import type { ConcertSummary } from '../../domain/catalog.types';
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

  async execute(now = new Date()): Promise<ConcertSummary[]> {
    return this.cache.getOrSet(
      ConcertCacheKeys.list(),
      TTL_SECONDS,
      () => this.inner.execute(now),
    );
  }
}
