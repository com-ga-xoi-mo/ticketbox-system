import type { RateLimitPolicy, RateLimitPolicyConfig } from './rate-limit-policy';

export interface TokenBucketConsumeCommand {
  readonly policy: RateLimitPolicy;
  readonly actorKey: string;
  readonly config: RateLimitPolicyConfig;
  readonly nowMs?: number;
}

export interface TokenBucketConsumeResult {
  readonly allowed: boolean;
  readonly remainingTokens: number;
  readonly retryAfterSeconds: number;
  readonly resetAfterSeconds: number;
}

export const TOKEN_BUCKET_STORE = Symbol('TokenBucketStore');

export interface TokenBucketStorePort {
  consume(command: TokenBucketConsumeCommand): Promise<TokenBucketConsumeResult>;
}
