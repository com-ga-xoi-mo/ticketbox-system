import { Inject, Injectable } from '@nestjs/common';

import {
  RateLimitExceededError,
  RateLimitStoreUnavailableError,
} from './rate-limit.errors';
import { RATE_LIMIT_POLICIES, type RateLimitPolicy } from './rate-limit-policy';
import {
  TOKEN_BUCKET_STORE,
  type TokenBucketStorePort,
} from './token-bucket.types';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(TOKEN_BUCKET_STORE)
    private readonly tokenBucketStore: TokenBucketStorePort,
  ) {}

  async consume(policy: RateLimitPolicy, actorKey: string): Promise<void> {
    const config = RATE_LIMIT_POLICIES[policy];

    try {
      const result = await this.tokenBucketStore.consume({
        policy,
        actorKey,
        config,
      });

      if (!result.allowed) {
        throw new RateLimitExceededError(policy, result.retryAfterSeconds);
      }
    } catch (err: unknown) {
      if (err instanceof RateLimitExceededError) {
        throw err;
      }

      if (err instanceof RateLimitStoreUnavailableError && config.failOpen) {
        return;
      }

      if (err instanceof RateLimitStoreUnavailableError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : 'Rate limit store is unavailable';
      throw new RateLimitStoreUnavailableError(policy, message);
    }
  }
}
