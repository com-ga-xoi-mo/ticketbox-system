import { describe, expect, it, vi } from 'vitest';

import {
  RateLimitExceededError,
  RateLimitStoreUnavailableError,
} from './rate-limit.errors';
import { RateLimitPolicy } from './rate-limit-policy';
import { RateLimitService } from './rate-limit.service';
import type { TokenBucketStorePort } from './token-bucket.types';

describe('RateLimitService', () => {
  it('throws exhausted-bucket errors with retry-after information', async () => {
    const store: TokenBucketStorePort = {
      consume: vi.fn().mockResolvedValue({
        allowed: false,
        remainingTokens: 0,
        retryAfterSeconds: 12,
        resetAfterSeconds: 12,
      }),
    };
    const service = new RateLimitService(store);

    await expect(service.consume(RateLimitPolicy.CHECKOUT, 'user:1')).rejects.toThrow(
      RateLimitExceededError,
    );
  });

  it('fails open for browsing when Redis is unavailable', async () => {
    const store: TokenBucketStorePort = {
      consume: vi
        .fn()
        .mockRejectedValue(new RateLimitStoreUnavailableError(RateLimitPolicy.BROWSING)),
    };
    const service = new RateLimitService(store);

    await expect(service.consume(RateLimitPolicy.BROWSING, 'ip:127.0.0.1')).resolves.toBeUndefined();
  });

  it('fails closed for protected unsafe policies when Redis is unavailable', async () => {
    const store: TokenBucketStorePort = {
      consume: vi
        .fn()
        .mockRejectedValue(new RateLimitStoreUnavailableError(RateLimitPolicy.CHECKOUT)),
    };
    const service = new RateLimitService(store);

    await expect(service.consume(RateLimitPolicy.CHECKOUT, 'user:1')).rejects.toThrow(
      RateLimitStoreUnavailableError,
    );
  });
});
