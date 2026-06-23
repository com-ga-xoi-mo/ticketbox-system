import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.tokens';
import type { CacheServicePort } from './cache.tokens';

const LOCK_TTL_SECONDS = 1;
const POLL_INTERVAL_MS = 25;
const MAX_POLL_ATTEMPTS = 10;

const SET_VALUE_AND_RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[2]) == ARGV[3] then
  redis.call("SET", KEYS[1], ARGV[1], "EX", tonumber(ARGV[2]))
  return redis.call("DEL", KEYS[2])
end
return 0
`;

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

type LockAcquireResult<T> =
  | { status: 'acquired' }
  | { status: 'locked' }
  | { status: 'fail-open'; value: T };

type CacheWaitResult<T> =
  | { status: 'hit'; value: T }
  | { status: 'miss' }
  | { status: 'fail-open'; value: T };

@Injectable()
export class RedisCacheService implements CacheServicePort {
  private readonly logger = new Logger(RedisCacheService.name);

  /** In-memory counters for demo/observability evidence. */
  private hitCount = 0;
  private missCount = 0;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  getHitCount(): number {
    return this.hitCount;
  }

  getMissCount(): number {
    return this.missCount;
  }

  async getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const lockKey = `lock:${key}`;

    // --- 1. Try to read from cache ---
    try {
      const raw = await this.redis.get(key);
      if (raw !== null) {
        this.hitCount++;
        this.logger.debug(`Cache HIT  key=${key} hits=${this.hitCount}`);
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      this.logger.warn(`Cache read error (fail-open) key=${key}`, (err as Error).message);
      // Fail-open: fall through to loader
      return loader();
    }

    // --- 2. Cache miss — coordinate loaders through a token-owned mutex lock ---
    while (true) {
      const token = randomUUID();
      const lockAcquired = await this.tryAcquireLock(lockKey, token, key, loader);

      if (lockAcquired.status === 'fail-open') {
        return lockAcquired.value;
      }

      if (lockAcquired.status === 'acquired') {
        return this.loadAndPublish(key, lockKey, token, ttlSeconds, loader);
      }

      this.logger.debug(`Cache MISS (lock-wait) key=${key}`);
      const cached = await this.waitForCachedValue<T>(key, loader);
      if (cached.status === 'hit') {
        return cached.value;
      }
      if (cached.status === 'fail-open') {
        return cached.value;
      }

      this.logger.debug(`Cache lock-wait exhausted (retry-lock) key=${key}`);
    }
  }

  private async tryAcquireLock<T>(
    lockKey: string,
    token: string,
    cacheKey: string,
    loader: () => Promise<T>,
  ): Promise<LockAcquireResult<T>> {
    try {
      const acquired = await this.redis.set(lockKey, token, 'EX', LOCK_TTL_SECONDS, 'NX');
      return acquired === 'OK' ? { status: 'acquired' } : { status: 'locked' };
    } catch (err) {
      this.logger.warn(
        `Cache lock acquire error (fail-open) key=${cacheKey}`,
        (err as Error).message,
      );
      return { status: 'fail-open', value: await loader() };
    }
  }

  private async loadAndPublish<T>(
    key: string,
    lockKey: string,
    token: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    let value: T;
    try {
      // loader() exceptions propagate unchanged — NOT cached
      value = await loader();
    } catch (loaderErr) {
      try {
        await this.releaseLockIfOwned(lockKey, token);
      } catch {
        // best effort: preserve the original loader error
      }
      throw loaderErr;
    }

    try {
      const released = await this.setValueAndReleaseLockIfOwned(
        key,
        lockKey,
        token,
        value,
        ttlSeconds,
      );

      if (!released) {
        this.logger.debug(`Cache MISS (stale winner returned without publish) key=${key}`);
      }
    } catch (err) {
      this.logger.warn(`Cache write error (fail-open) key=${key}`, (err as Error).message);
    }

    this.missCount++;
    this.logger.debug(`Cache MISS (winner) key=${key} misses=${this.missCount}`);
    return value;
  }

  private async waitForCachedValue<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<CacheWaitResult<T>> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const raw = await this.redis.get(key);
        if (raw !== null) {
          this.hitCount++;
          this.logger.debug(`Cache HIT (lock-wait resolved) key=${key} attempt=${attempt}`);
          return { status: 'hit', value: JSON.parse(raw) as T };
        }
      } catch (err) {
        this.logger.warn(
          `Cache lock-wait read error (fail-open) key=${key}`,
          (err as Error).message,
        );
        return { status: 'fail-open', value: await loader() };
      }
    }

    return { status: 'miss' };
  }

  private async setValueAndReleaseLockIfOwned<T>(
    key: string,
    lockKey: string,
    token: string,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      SET_VALUE_AND_RELEASE_LOCK_SCRIPT,
      2,
      key,
      lockKey,
      JSON.stringify(value),
      String(ttlSeconds),
      token,
    );
    return result === 1;
  }

  private async releaseLockIfOwned(lockKey: string, token: string): Promise<boolean> {
    const result = await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    return result === 1;
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Cache del error (fail-open) key=${key}`, (err as Error).message);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      // SCAN in a cursor loop — never KEYS (would block Redis)
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      if (keysToDelete.length === 0) {
        return;
      }

      // Pipelined DEL for efficiency
      const pipeline = this.redis.pipeline();
      for (const k of keysToDelete) {
        pipeline.del(k);
      }
      await pipeline.exec();

      this.logger.debug(`Cache delByPrefix prefix=${prefix} deleted=${keysToDelete.length}`);
    } catch (err) {
      this.logger.warn(
        `Cache delByPrefix error (fail-open) prefix=${prefix}`,
        (err as Error).message,
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
