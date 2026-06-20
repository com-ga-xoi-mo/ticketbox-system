import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.tokens';
import { RateLimitStoreUnavailableError } from './rate-limit.errors';
import type {
  TokenBucketConsumeCommand,
  TokenBucketConsumeResult,
  TokenBucketStorePort,
} from './token-bucket.types';

const CONSUME_TOKEN_SCRIPT = `
local capacity = tonumber(ARGV[1])
local refillTokens = tonumber(ARGV[2])
local refillIntervalMs = tonumber(ARGV[3])
local nowMs = tonumber(ARGV[4])
local ttlMs = tonumber(ARGV[5])

local currentTokens = redis.call('HGET', KEYS[1], 'tokens')
local lastRefilledAt = redis.call('HGET', KEYS[1], 'lastRefilledAt')

local tokens = currentTokens and tonumber(currentTokens) or capacity
local last = lastRefilledAt and tonumber(lastRefilledAt) or nowMs
local elapsedMs = math.max(0, nowMs - last)
local refillIntervals = math.floor(elapsedMs / refillIntervalMs)

if refillIntervals > 0 then
  tokens = math.min(capacity, tokens + (refillIntervals * refillTokens))
  last = last + (refillIntervals * refillIntervalMs)
end

local allowed = 0
local retryAfterMs = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  local missingTokens = 1 - tokens
  retryAfterMs = math.ceil(missingTokens * refillIntervalMs / refillTokens)
end

local resetAfterMs = math.ceil((capacity - tokens) * refillIntervalMs / refillTokens)

redis.call(
  'HSET',
  KEYS[1],
  'tokens',
  tostring(tokens),
  'lastRefilledAt',
  tostring(last),
  'updatedAt',
  tostring(nowMs)
)
redis.call('PEXPIRE', KEYS[1], ttlMs)

return {allowed, tostring(tokens), tostring(retryAfterMs), tostring(resetAfterMs)}
`;

@Injectable()
export class RedisTokenBucketStore implements TokenBucketStorePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async consume(command: TokenBucketConsumeCommand): Promise<TokenBucketConsumeResult> {
    try {
      const result = await this.redis.eval(
        CONSUME_TOKEN_SCRIPT,
        1,
        this.buildBucketKey(command.policy, command.actorKey),
        String(command.config.capacity),
        String(command.config.refillTokens),
        String(command.config.refillIntervalMs),
        String(command.nowMs ?? Date.now()),
        String(command.config.ttlMs),
      );

      return this.parseResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Rate limit store is unavailable';
      throw new RateLimitStoreUnavailableError(command.policy, message);
    }
  }

  private buildBucketKey(policy: string, actorKey: string): string {
    return ['ticketbox', 'rate-limit', policy, actorKey].join(':');
  }

  private parseResult(result: unknown): TokenBucketConsumeResult {
    if (!Array.isArray(result) || result.length < 4) {
      throw new Error('Rate limit store returned an invalid response');
    }

    const [allowed, remainingTokens, retryAfterMs, resetAfterMs] = result.map(Number);

    return {
      allowed: allowed === 1,
      remainingTokens,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      resetAfterSeconds: Math.max(1, Math.ceil(resetAfterMs / 1000)),
    };
  }
}
