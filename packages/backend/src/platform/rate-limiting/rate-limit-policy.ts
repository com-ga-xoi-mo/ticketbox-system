export enum RateLimitPolicy {
  BROWSING = 'BROWSING',
  CHECKOUT = 'CHECKOUT',
  PAYMENT_INITIATION = 'PAYMENT_INITIATION',
  ADMIN_WRITE = 'ADMIN_WRITE',
  CHECKIN_SYNC = 'CHECKIN_SYNC',
}

export interface RateLimitPolicyConfig {
  readonly policy: RateLimitPolicy;
  readonly capacity: number;
  readonly refillTokens: number;
  readonly refillIntervalMs: number;
  readonly ttlMs: number;
  readonly failOpen: boolean;
}

const MINUTE_MS = 60_000;

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicy, RateLimitPolicyConfig> = {
  [RateLimitPolicy.BROWSING]: {
    policy: RateLimitPolicy.BROWSING,
    capacity: 120,
    refillTokens: 120,
    refillIntervalMs: MINUTE_MS,
    ttlMs: 2 * MINUTE_MS,
    failOpen: true,
  },
  [RateLimitPolicy.CHECKOUT]: {
    policy: RateLimitPolicy.CHECKOUT,
    capacity: 5,
    refillTokens: 5,
    refillIntervalMs: MINUTE_MS,
    ttlMs: 2 * MINUTE_MS,
    failOpen: false,
  },
  [RateLimitPolicy.PAYMENT_INITIATION]: {
    policy: RateLimitPolicy.PAYMENT_INITIATION,
    capacity: 3,
    refillTokens: 3,
    refillIntervalMs: MINUTE_MS,
    ttlMs: 2 * MINUTE_MS,
    failOpen: false,
  },
  [RateLimitPolicy.ADMIN_WRITE]: {
    policy: RateLimitPolicy.ADMIN_WRITE,
    capacity: 20,
    refillTokens: 20,
    refillIntervalMs: MINUTE_MS,
    ttlMs: 2 * MINUTE_MS,
    failOpen: false,
  },
  [RateLimitPolicy.CHECKIN_SYNC]: {
    policy: RateLimitPolicy.CHECKIN_SYNC,
    capacity: 60,
    refillTokens: 60,
    refillIntervalMs: MINUTE_MS,
    ttlMs: 2 * MINUTE_MS,
    failOpen: false,
  },
};
