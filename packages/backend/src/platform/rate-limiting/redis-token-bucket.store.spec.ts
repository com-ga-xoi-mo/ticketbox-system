import { describe, expect, it } from 'vitest';

import { RateLimitPolicy, RATE_LIMIT_POLICIES } from './rate-limit-policy';
import { RedisTokenBucketStore } from './redis-token-bucket.store';

class FakeRedis {
  readonly buckets = new Map<string, { tokens: number; lastRefilledAt: number }>();

  async eval(
    _script: string,
    _keyCount: number,
    key: string,
    capacityArg: string,
    refillTokensArg: string,
    refillIntervalMsArg: string,
    nowMsArg: string,
    _ttlMsArg: string,
  ): Promise<[number, string, string, string]> {
    const capacity = Number(capacityArg);
    const refillTokens = Number(refillTokensArg);
    const refillIntervalMs = Number(refillIntervalMsArg);
    const nowMs = Number(nowMsArg);
    const existing = this.buckets.get(key);
    let tokens = existing?.tokens ?? capacity;
    let lastRefilledAt = existing?.lastRefilledAt ?? nowMs;

    const elapsedMs = Math.max(0, nowMs - lastRefilledAt);
    const intervals = Math.floor(elapsedMs / refillIntervalMs);

    if (intervals > 0) {
      tokens = Math.min(capacity, tokens + intervals * refillTokens);
      lastRefilledAt += intervals * refillIntervalMs;
    }

    let allowed = 0;
    let retryAfterMs = 0;

    if (tokens >= 1) {
      tokens -= 1;
      allowed = 1;
    } else {
      retryAfterMs = Math.ceil(((1 - tokens) * refillIntervalMs) / refillTokens);
    }

    const resetAfterMs = Math.ceil(((capacity - tokens) * refillIntervalMs) / refillTokens);
    this.buckets.set(key, { tokens, lastRefilledAt });

    return [allowed, String(tokens), String(retryAfterMs), String(resetAfterMs)];
  }
}

describe('RedisTokenBucketStore', () => {
  it('allows requests within capacity and rejects sustained traffic with retry-after', async () => {
    const redis = new FakeRedis();
    const store = new RedisTokenBucketStore(redis as never);
    const config = {
      ...RATE_LIMIT_POLICIES[RateLimitPolicy.CHECKOUT],
      capacity: 2,
      refillTokens: 1,
    };

    await expect(
      store.consume({ policy: RateLimitPolicy.CHECKOUT, actorKey: 'user:1', config, nowMs: 0 }),
    ).resolves.toMatchObject({ allowed: true, remainingTokens: 1 });
    await expect(
      store.consume({ policy: RateLimitPolicy.CHECKOUT, actorKey: 'user:1', config, nowMs: 0 }),
    ).resolves.toMatchObject({ allowed: true, remainingTokens: 0 });

    await expect(
      store.consume({ policy: RateLimitPolicy.CHECKOUT, actorKey: 'user:1', config, nowMs: 0 }),
    ).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 60 });
  });

  it('refills after the configured interval', async () => {
    const redis = new FakeRedis();
    const store = new RedisTokenBucketStore(redis as never);
    const config = { ...RATE_LIMIT_POLICIES[RateLimitPolicy.PAYMENT_INITIATION], capacity: 1 };

    await store.consume({
      policy: RateLimitPolicy.PAYMENT_INITIATION,
      actorKey: 'user:1:order:1',
      config,
      nowMs: 0,
    });

    await expect(
      store.consume({
        policy: RateLimitPolicy.PAYMENT_INITIATION,
        actorKey: 'user:1:order:1',
        config,
        nowMs: 60_000,
      }),
    ).resolves.toMatchObject({ allowed: true, remainingTokens: 0 });
  });

  it('keeps endpoint policy buckets isolated for the same actor', async () => {
    const redis = new FakeRedis();
    const store = new RedisTokenBucketStore(redis as never);
    const checkoutConfig = { ...RATE_LIMIT_POLICIES[RateLimitPolicy.CHECKOUT], capacity: 1 };
    const browsingConfig = { ...RATE_LIMIT_POLICIES[RateLimitPolicy.BROWSING], capacity: 1 };

    await store.consume({
      policy: RateLimitPolicy.CHECKOUT,
      actorKey: 'user:1',
      config: checkoutConfig,
      nowMs: 0,
    });
    await expect(
      store.consume({
        policy: RateLimitPolicy.CHECKOUT,
        actorKey: 'user:1',
        config: checkoutConfig,
        nowMs: 0,
      }),
    ).resolves.toMatchObject({ allowed: false });

    await expect(
      store.consume({
        policy: RateLimitPolicy.BROWSING,
        actorKey: 'user:1',
        config: browsingConfig,
        nowMs: 0,
      }),
    ).resolves.toMatchObject({ allowed: true });
  });
});
