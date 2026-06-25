/**
 * Canonical cache-key builder for the concert catalog namespace.
 *
 * All cache reads, writes, and invalidation prefix-flushes go through
 * this helper so keys and prefixes always match. RedisCacheService stores
 * keys verbatim (no extra prefix added by the service).
 *
 * Canonical keys:
 *   ticketbox:cache:concert:list
 *   ticketbox:cache:concert:detail:{slug}
 *   ticketbox:cache:concert:availability:{slug}
 *
 * Flush prefix (covers all three above):
 *   ticketbox:cache:concert:
 */
export const ConcertCacheKeys = {
  /** Prefix that covers the list, detail, and availability keys. */
  NAMESPACE_PREFIX: 'ticketbox:cache:concert:',

  list(): string {
    return 'ticketbox:cache:concert:list';
  },

  detail(slug: string): string {
    return `ticketbox:cache:concert:detail:${slug}`;
  },

  availability(slug: string): string {
    return `ticketbox:cache:concert:availability:${slug}`;
  },
} as const;
