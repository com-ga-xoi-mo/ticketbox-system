import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';
import {
  PaymentCircuitBreakerStoreUnavailableError,
  PaymentProviderCircuitOpenError,
  PaymentProviderHalfOpenTrialRejectedError,
} from '../../domain/errors';
import type { PaymentProvider } from '../../domain/payment-provider.enum';
import {
  PAYMENT_CIRCUIT_FAILURE_THRESHOLD,
  PAYMENT_CIRCUIT_HALF_OPEN_MAX_TRIALS,
  PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS,
  PaymentCircuitBreakerState,
  type AcquirePaymentProviderCallData,
  type PaymentCircuitBreakerPermit,
  type PaymentCircuitBreakerPort,
  type RecordPaymentProviderCallData,
} from '../../domain/ports/payment-circuit-breaker.port';

const CIRCUIT_TTL_MS = PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS * 4;

const ACQUIRE_PROVIDER_CALL_SCRIPT = `
local state = redis.call('HGET', KEYS[1], 'state')
local nowMs = tonumber(ARGV[1])
local cooldownMs = tonumber(ARGV[2])
local maxHalfOpenTrials = tonumber(ARGV[3])

if not state or state == '' or state == 'CLOSED' then
  return {'ALLOW', 'CLOSED', '0'}
end

if state == 'OPEN' then
  local openedUntil = tonumber(redis.call('HGET', KEYS[1], 'openedUntil') or '0')
  if openedUntil > nowMs then
    return {'BLOCK_OPEN', 'OPEN', tostring(openedUntil - nowMs)}
  end

  redis.call(
    'HSET',
    KEYS[1],
    'state',
    'HALF_OPEN',
    'failureCount',
    '0',
    'openedUntil',
    '0',
    'halfOpenTrialCount',
    '1',
    'updatedAt',
    tostring(nowMs)
  )
  redis.call('PEXPIRE', KEYS[1], ARGV[4])
  return {'ALLOW', 'HALF_OPEN', '0'}
end

if state == 'HALF_OPEN' then
  local trials = redis.call('HINCRBY', KEYS[1], 'halfOpenTrialCount', 1)
  redis.call('HSET', KEYS[1], 'updatedAt', tostring(nowMs))
  redis.call('PEXPIRE', KEYS[1], ARGV[4])

  if trials <= maxHalfOpenTrials then
    return {'ALLOW', 'HALF_OPEN', '0'}
  end

  return {'BLOCK_HALF_OPEN', 'HALF_OPEN', '0'}
end

return {'ALLOW', 'CLOSED', '0'}
`;

@Injectable()
export class RedisPaymentCircuitBreaker implements PaymentCircuitBreakerPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquireProviderCall(
    data: AcquirePaymentProviderCallData,
  ): Promise<PaymentCircuitBreakerPermit> {
    const key = this.buildCircuitKey(data.provider);

    try {
      const result = await this.redis.eval(
        ACQUIRE_PROVIDER_CALL_SCRIPT,
        1,
        key,
        String(Date.now()),
        String(PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS),
        String(PAYMENT_CIRCUIT_HALF_OPEN_MAX_TRIALS),
        String(CIRCUIT_TTL_MS),
      );

      const [decision, state, retryAfterMs] = this.parseAcquireResult(result);
      if (decision === 'ALLOW') {
        return {
          provider: data.provider,
          state: state as PaymentCircuitBreakerPermit['state'],
        };
      }

      if (decision === 'BLOCK_OPEN') {
        throw new PaymentProviderCircuitOpenError(data.provider, Number(retryAfterMs));
      }

      throw new PaymentProviderHalfOpenTrialRejectedError(data.provider);
    } catch (err: unknown) {
      throw this.toCircuitStoreError(err);
    }
  }

  async recordProviderCallSuccess(data: RecordPaymentProviderCallData): Promise<void> {
    const key = this.buildCircuitKey(data.provider);

    try {
      await this.redis.del(key);
    } catch (err: unknown) {
      throw this.toCircuitStoreError(err);
    }
  }

  async recordProviderCallFailure(data: RecordPaymentProviderCallData): Promise<void> {
    const key = this.buildCircuitKey(data.provider);
    const nowMs = Date.now();
    const openedUntil = nowMs + PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS;

    try {
      if (data.permit.state === PaymentCircuitBreakerState.HALF_OPEN) {
        await this.redis.hset(key, {
          state: PaymentCircuitBreakerState.OPEN,
          failureCount: String(PAYMENT_CIRCUIT_FAILURE_THRESHOLD),
          openedUntil: String(openedUntil),
          halfOpenTrialCount: '0',
          updatedAt: String(nowMs),
        });
        await this.redis.pexpire(key, CIRCUIT_TTL_MS);
        return;
      }

      const failureCount = await this.redis.hincrby(key, 'failureCount', 1);
      const state =
        failureCount >= PAYMENT_CIRCUIT_FAILURE_THRESHOLD
          ? PaymentCircuitBreakerState.OPEN
          : PaymentCircuitBreakerState.CLOSED;

      await this.redis.hset(key, {
        state,
        failureCount: String(failureCount),
        openedUntil: state === PaymentCircuitBreakerState.OPEN ? String(openedUntil) : '0',
        halfOpenTrialCount: '0',
        updatedAt: String(nowMs),
      });
      await this.redis.pexpire(key, CIRCUIT_TTL_MS);
    } catch (err: unknown) {
      throw this.toCircuitStoreError(err);
    }
  }

  private buildCircuitKey(provider: PaymentProvider): string {
    return ['ticketbox', 'payment', 'circuit', provider].join(':');
  }

  private parseAcquireResult(result: unknown): [string, string, string] {
    if (!Array.isArray(result) || result.length < 3) {
      throw new PaymentCircuitBreakerStoreUnavailableError(
        'Payment circuit breaker returned an invalid response',
      );
    }

    return result.map(String) as [string, string, string];
  }

  private toCircuitStoreError(err: unknown): Error {
    if (
      err instanceof PaymentProviderCircuitOpenError ||
      err instanceof PaymentProviderHalfOpenTrialRejectedError ||
      err instanceof PaymentCircuitBreakerStoreUnavailableError
    ) {
      return err;
    }

    const message = err instanceof Error ? err.message : 'Payment circuit breaker store is unavailable';
    return new PaymentCircuitBreakerStoreUnavailableError(message);
  }
}
