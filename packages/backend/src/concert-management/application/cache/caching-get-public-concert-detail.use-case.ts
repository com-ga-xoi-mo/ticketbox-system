import type { ConcertDetail } from '../../domain/catalog.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { GetPublicConcertDetailUseCase } from '../use-cases/get-public-concert-detail.use-case';
import { ConcertCacheKeys } from './concert-cache-keys';

const TTL_SECONDS = 60;

/**
 * Decorator for `GetPublicConcertDetailUseCase`.
 * Key: `ticketbox:cache:concert:detail:{slug}`, TTL 60s.
 *
 * Exceptions (e.g. `PublicConcertNotFoundError`) propagate unchanged and are
 * NOT cached (fail-open is for Redis errors only).
 */
export class CachingGetPublicConcertDetailUseCase {
  constructor(
    private readonly inner: GetPublicConcertDetailUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(slug: string, now = new Date()): Promise<ConcertDetail> {
    return this.cache.getOrSet(
      ConcertCacheKeys.detail(slug),
      TTL_SECONDS,
      () => this.inner.execute(slug, now),
    );
  }
}
