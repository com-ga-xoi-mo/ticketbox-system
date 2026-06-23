import type { ConcertAvailabilitySnapshot } from '../../domain/catalog.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { GetConcertAvailabilityUseCase } from '../use-cases/get-concert-availability.use-case';
import { ConcertCacheKeys } from './concert-cache-keys';

/** Short TTL — self-refreshing snapshot, no event coupling needed. */
const TTL_SECONDS = 5;

/**
 * Decorator for `GetConcertAvailabilityUseCase`.
 * Key: `ticketbox:cache:concert:availability:{slug}`, TTL 5s.
 *
 * Availability data changes continuously during a sale, so a short TTL
 * self-refreshes cheaply without per-event invalidation. The 5s window means
 * staleness ≤ 5s, which is acceptable for a display snapshot (the oversell
 * guard lives in the reservation transaction, not here).
 */
export class CachingGetConcertAvailabilityUseCase {
  constructor(
    private readonly inner: GetConcertAvailabilityUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(slug: string, now = new Date()): Promise<ConcertAvailabilitySnapshot> {
    return this.cache.getOrSet(
      ConcertCacheKeys.availability(slug),
      TTL_SECONDS,
      () => this.inner.execute(slug, now),
    );
  }
}
