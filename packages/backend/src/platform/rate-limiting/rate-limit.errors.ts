import type { RateLimitPolicy } from './rate-limit-policy';

export class RateLimitExceededError extends Error {
  constructor(
    readonly policy: RateLimitPolicy,
    readonly retryAfterSeconds: number,
  ) {
    super(`Rate limit exceeded for policy: ${policy}`);
    this.name = 'RateLimitExceededError';
  }
}

export class RateLimitStoreUnavailableError extends Error {
  constructor(
    readonly policy: RateLimitPolicy,
    message = 'Rate limit store is unavailable',
  ) {
    super(message);
    this.name = 'RateLimitStoreUnavailableError';
  }
}
