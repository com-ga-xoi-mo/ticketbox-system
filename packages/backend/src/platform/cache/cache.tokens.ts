export const CACHE_SERVICE = Symbol('CACHE_SERVICE');

/**
 * Port interface for the cache service. Decorators depend on this port,
 * not the concrete RedisCacheService, enabling unit testing with a fake.
 */
export interface CacheServicePort {
  /**
   * Return the cached value for `key`, or call `loader()` on a miss,
   * cache the result for `ttlSeconds`, and return it.
   *
   * Fail-open: any *Redis* error falls through to `loader()`.
   * Exceptions from `loader()` are propagated and NOT cached.
   */
  getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>;

  /** Remove a single key. Fail-open on Redis errors. */
  del(key: string): Promise<void>;

  /**
   * Remove all keys whose full Redis key starts with `prefix`.
   * MUST use SCAN (cursor loop) + pipelined DEL — never KEYS.
   * Fail-open on Redis errors.
   */
  delByPrefix(prefix: string): Promise<void>;
}
