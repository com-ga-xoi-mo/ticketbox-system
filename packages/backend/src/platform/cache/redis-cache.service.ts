import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.tokens';
import type { CacheServicePort } from './cache.tokens';

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

    // --- 2. Cache miss — try to acquire SETNX mutex lock ---
    const lockKey = `lock:${key}`;
    let lockAcquired = false;

    try {
      const acquired = await this.redis.set(lockKey, '1', 'EX', 1, 'NX');
      lockAcquired = acquired === 'OK';
    } catch (err) {
      this.logger.warn(`Cache lock acquire error (fail-open) key=${key}`, (err as Error).message);
      // Fail-open: skip locking, fall through to loader
    }

    if (lockAcquired) {
      // --- 3. Winner: run loader, cache the result, release lock ---
      let value: T;
      try {
        // loader() exceptions propagate unchanged — NOT cached
        value = await loader();
      } catch (loaderErr) {
        // Release lock before re-throwing so losers can proceed
        try {
          await this.redis.del(lockKey);
        } catch {
          // best effort
        }
        throw loaderErr;
      }

      // Cache the loaded value BEFORE releasing the lock (so losers can read it)
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        this.logger.warn(`Cache write error (fail-open) key=${key}`, (err as Error).message);
      }

      try {
        await this.redis.del(lockKey);
      } catch {
        // best effort — lock has PX 1000 auto-expiry anyway
      }

      this.missCount++;
      this.logger.debug(`Cache MISS (winner) key=${key} misses=${this.missCount}`);
      return value;
    } else {
      // --- 4. Loser: poll the value key until the winner populates it ---
      this.logger.debug(`Cache MISS (lock-wait) key=${key}`);
      const POLL_INTERVAL_MS = 25;
      const MAX_ATTEMPTS = 10;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        try {
          const raw = await this.redis.get(key);
          if (raw !== null) {
            this.hitCount++;
            this.logger.debug(`Cache HIT (lock-wait resolved) key=${key} attempt=${attempt}`);
            return JSON.parse(raw) as T;
          }
        } catch {
          // Fail-open on poll errors — continue trying
        }
      }

      // Exhausted: fall through to own loader() — correctness preserved
      this.logger.debug(`Cache lock-wait exhausted (fall-through) key=${key}`);
      this.missCount++;
      return loader();
    }
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
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
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
      this.logger.warn(`Cache delByPrefix error (fail-open) prefix=${prefix}`, (err as Error).message);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
