/**
 * RedisCacheService integration tests.
 *
 * These tests run against the real Redis provided by `npm run start:deps`
 * (docker-compose). They are SKIPPED when `REDIS_URL` is not set so they
 * never break the default `vitest run` (hermetic unit run).
 *
 * Run with:  REDIS_URL=redis://localhost:6379 npx vitest run redis-cache.service.spec.ts
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Redis from 'ioredis';

import { RedisCacheService } from './redis-cache.service';

const REDIS_URL = process.env['REDIS_URL'];
const describeIfRedis = REDIS_URL ? describe : describe.skip;

const TEST_KEY_PREFIX = 'test:ticketbox:cache:';

describeIfRedis('RedisCacheService integration (requires REDIS_URL)', () => {
  let redis: Redis;
  let svc: RedisCacheService;

  beforeEach(async () => {
    redis = new Redis(REDIS_URL!);
    // Clean up any leftover test keys before each test
    const keys = await redis.keys(`${TEST_KEY_PREFIX}*`);
    if (keys.length) {
      await redis.del(...keys);
    }
    // Inject the real Redis client into the service (bypass DI for testing)
    svc = new RedisCacheService(redis as any);
  });

  afterEach(async () => {
    // Clean up test keys
    const keys = await redis.keys(`${TEST_KEY_PREFIX}*`);
    if (keys.length) {
      await redis.del(...keys);
    }
    await redis.quit();
  });

  it('SETNX mutex: fast concurrent misses invoke the loader exactly once', async () => {
    const key = `${TEST_KEY_PREFIX}thunderherd`;
    let loaderCallCount = 0;

    const loader = async () => {
      loaderCallCount++;
      // Simulate a slow DB read (enough for other concurrent calls to start)
      await sleep(50);
      return 'loaded-value';
    };

    // Fire 10 concurrent getOrSet calls simultaneously
    const results = await Promise.all(
      Array.from({ length: 10 }, () => svc.getOrSet(key, 60, loader)),
    );

    // All callers get the correct value
    expect(results.every((r) => r === 'loaded-value')).toBe(true);

    expect(loaderCallCount).toBe(1);
  }, 10_000);

  it('slow original winner does not release every loser to the loader', async () => {
    const key = `${TEST_KEY_PREFIX}slow-winner`;
    let loaderCallCount = 0;

    const loader = async () => {
      loaderCallCount++;
      const callNumber = loaderCallCount;
      if (callNumber === 1) {
        await sleep(1300);
        return 'stale-original-winner';
      }
      await sleep(50);
      return `fresh-winner-${callNumber}`;
    };

    const originalWinner = svc.getOrSet(key, 60, loader);

    // Let the original request acquire the lock and enter its slow loader.
    await sleep(50);

    const loserResults = await Promise.all(
      Array.from({ length: 9 }, () => svc.getOrSet(key, 60, loader)),
    );
    const originalWinnerResult = await originalWinner;

    expect(originalWinnerResult).toBe('stale-original-winner');
    expect(loserResults.every((result) => result === 'fresh-winner-2')).toBe(true);
    expect(loaderCallCount).toBe(2);
  }, 10_000);

  it('stale original winner cannot overwrite the newer cached value or lock', async () => {
    const key = `${TEST_KEY_PREFIX}stale-owner`;
    const lockKey = `lock:${key}`;
    let loaderCallCount = 0;

    const loader = async () => {
      loaderCallCount++;
      const callNumber = loaderCallCount;
      if (callNumber === 1) {
        await sleep(1300);
        return 'stale-original-winner';
      }
      await sleep(50);
      return `fresh-winner-${callNumber}`;
    };

    const originalWinner = svc.getOrSet(key, 60, loader);
    await sleep(50);

    const loserResults = await Promise.all(
      Array.from({ length: 3 }, () => svc.getOrSet(key, 60, loader)),
    );
    const originalWinnerResult = await originalWinner;

    expect(originalWinnerResult).toBe('stale-original-winner');
    expect(loserResults.every((result) => result === 'fresh-winner-2')).toBe(true);

    const cachedRaw = await redis.get(key);
    expect(cachedRaw).not.toBeNull();
    expect(JSON.parse(cachedRaw!)).toBe('fresh-winner-2');
    expect(await redis.exists(lockKey)).toBe(0);
  }, 10_000);

  it('TTL expiry: loader is called again after the cache key expires', async () => {
    const key = `${TEST_KEY_PREFIX}ttl-expiry`;
    let loaderCallCount = 0;

    const loader = async () => {
      loaderCallCount++;
      return `value-${loaderCallCount}`;
    };

    // Cache with 1-second TTL
    const v1 = await svc.getOrSet(key, 1, loader);
    expect(v1).toBe('value-1');
    expect(loaderCallCount).toBe(1);

    // Second call within TTL — still cached
    const v2 = await svc.getOrSet(key, 1, loader);
    expect(v2).toBe('value-1');
    expect(loaderCallCount).toBe(1);

    // Wait for TTL to expire (Redis EX is in seconds — need > 1s)
    await sleep(1100);

    // Third call after expiry — loader re-runs
    const v3 = await svc.getOrSet(key, 1, loader);
    expect(v3).toBe('value-2');
    expect(loaderCallCount).toBe(2);
  }, 10_000);

  it('delByPrefix: removes all matching keys via SCAN, leaves others intact', async () => {
    const prefix = `${TEST_KEY_PREFIX}concert:`;
    const matchingKeys = [
      `${prefix}list`,
      `${prefix}detail:some-slug`,
      `${prefix}availability:some-slug`,
    ];
    const otherKey = `${TEST_KEY_PREFIX}other:key`;

    // Seed the matching keys and the other key directly
    await Promise.all([
      ...matchingKeys.map((k) => redis.set(k, 'value', 'EX', 60)),
      redis.set(otherKey, 'other-value', 'EX', 60),
    ]);

    // Verify all keys exist
    for (const k of matchingKeys) {
      expect(await redis.exists(k)).toBe(1);
    }
    expect(await redis.exists(otherKey)).toBe(1);

    // Flush by prefix
    await svc.delByPrefix(prefix);

    // Matching keys should be gone
    for (const k of matchingKeys) {
      expect(await redis.exists(k)).toBe(0);
    }

    // Non-matching key must remain
    expect(await redis.exists(otherKey)).toBe(1);
  }, 10_000);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
