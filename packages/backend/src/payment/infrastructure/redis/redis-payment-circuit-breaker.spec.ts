import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PaymentCircuitBreakerStoreUnavailableError,
  PaymentProviderCircuitOpenError,
  PaymentProviderHalfOpenTrialRejectedError,
} from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import {
  PAYMENT_CIRCUIT_FAILURE_THRESHOLD,
  PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS,
  PaymentCircuitBreakerState,
} from '../../domain/ports/payment-circuit-breaker.port';
import { RedisPaymentCircuitBreaker } from './redis-payment-circuit-breaker';

class FakeRedis {
  readonly hashes = new Map<string, Record<string, string>>();
  fail = false;

  async eval(
    _script: string,
    _keyCount: number,
    key: string,
    nowValue: string,
    cooldownValue: string,
    maxTrialsValue: string,
  ): Promise<[string, string, string]> {
    this.throwIfFailed();

    const nowMs = Number(nowValue);
    const cooldownMs = Number(cooldownValue);
    const maxTrials = Number(maxTrialsValue);
    const hash = this.hashes.get(key);
    const state = hash?.state;

    if (!state || state === PaymentCircuitBreakerState.CLOSED) {
      return ['ALLOW', PaymentCircuitBreakerState.CLOSED, '0'];
    }

    if (state === PaymentCircuitBreakerState.OPEN) {
      const openedUntil = Number(hash.openedUntil ?? '0');
      if (openedUntil > nowMs) {
        return ['BLOCK_OPEN', PaymentCircuitBreakerState.OPEN, String(openedUntil - nowMs)];
      }

      this.hashes.set(key, {
        state: PaymentCircuitBreakerState.HALF_OPEN,
        failureCount: '0',
        openedUntil: '0',
        halfOpenTrialCount: '1',
        updatedAt: String(nowMs),
      });
      return ['ALLOW', PaymentCircuitBreakerState.HALF_OPEN, '0'];
    }

    const trialCount = Number(hash?.halfOpenTrialCount ?? '0') + 1;
    this.hashes.set(key, {
      ...(hash ?? {}),
      halfOpenTrialCount: String(trialCount),
      updatedAt: String(nowMs),
    });

    if (trialCount <= maxTrials) {
      return ['ALLOW', PaymentCircuitBreakerState.HALF_OPEN, '0'];
    }

    return ['BLOCK_HALF_OPEN', PaymentCircuitBreakerState.HALF_OPEN, '0'];
  }

  async del(key: string): Promise<number> {
    this.throwIfFailed();
    return this.hashes.delete(key) ? 1 : 0;
  }

  async hset(key: string, data: Record<string, string>): Promise<number> {
    this.throwIfFailed();
    this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...data });
    return Object.keys(data).length;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    this.throwIfFailed();
    const hash = this.hashes.get(key) ?? {};
    const next = Number(hash[field] ?? '0') + increment;
    this.hashes.set(key, { ...hash, [field]: String(next) });
    return next;
  }

  async pexpire(): Promise<number> {
    this.throwIfFailed();
    return 1;
  }

  private throwIfFailed(): void {
    if (this.fail) {
      throw new Error('redis down');
    }
  }
}

function providerKey(provider: PaymentProvider): string {
  return ['ticketbox', 'payment', 'circuit', provider].join(':');
}

describe('RedisPaymentCircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens after the configured closed-state failure threshold', async () => {
    const redis = new FakeRedis();
    const circuit = new RedisPaymentCircuitBreaker(redis as never);

    for (let index = 0; index < PAYMENT_CIRCUIT_FAILURE_THRESHOLD; index += 1) {
      const permit = await circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR });
      await circuit.recordProviderCallFailure({
        provider: PaymentProvider.SIMULATOR,
        permit,
      });
    }

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).rejects.toThrow(PaymentProviderCircuitOpenError);
  });

  it('moves from open to half-open after cooldown and enforces trial limit', async () => {
    const redis = new FakeRedis();
    const circuit = new RedisPaymentCircuitBreaker(redis as never);

    redis.hashes.set(providerKey(PaymentProvider.SIMULATOR), {
      state: PaymentCircuitBreakerState.OPEN,
      failureCount: String(PAYMENT_CIRCUIT_FAILURE_THRESHOLD),
      openedUntil: String(Date.now() + PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS),
      halfOpenTrialCount: '0',
      updatedAt: String(Date.now()),
    });

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).rejects.toThrow(PaymentProviderCircuitOpenError);

    vi.advanceTimersByTime(PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS + 1);

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).resolves.toMatchObject({ state: PaymentCircuitBreakerState.HALF_OPEN });
    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).rejects.toThrow(PaymentProviderHalfOpenTrialRejectedError);
  });

  it('closes and resets counters after successful half-open provider call', async () => {
    const redis = new FakeRedis();
    const circuit = new RedisPaymentCircuitBreaker(redis as never);
    redis.hashes.set(providerKey(PaymentProvider.SIMULATOR), {
      state: PaymentCircuitBreakerState.OPEN,
      failureCount: String(PAYMENT_CIRCUIT_FAILURE_THRESHOLD),
      openedUntil: String(Date.now() - 1),
      halfOpenTrialCount: '0',
      updatedAt: String(Date.now()),
    });

    const permit = await circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR });
    await circuit.recordProviderCallSuccess({ provider: PaymentProvider.SIMULATOR, permit });

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).resolves.toMatchObject({ state: PaymentCircuitBreakerState.CLOSED });
  });

  it('reopens after failed half-open provider call', async () => {
    const redis = new FakeRedis();
    const circuit = new RedisPaymentCircuitBreaker(redis as never);
    redis.hashes.set(providerKey(PaymentProvider.SIMULATOR), {
      state: PaymentCircuitBreakerState.OPEN,
      failureCount: String(PAYMENT_CIRCUIT_FAILURE_THRESHOLD),
      openedUntil: String(Date.now() - 1),
      halfOpenTrialCount: '0',
      updatedAt: String(Date.now()),
    });

    const permit = await circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR });
    await circuit.recordProviderCallFailure({ provider: PaymentProvider.SIMULATOR, permit });

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).rejects.toThrow(PaymentProviderCircuitOpenError);
  });

  it('keeps provider circuits isolated', async () => {
    const redis = new FakeRedis();
    const circuit = new RedisPaymentCircuitBreaker(redis as never);
    redis.hashes.set(providerKey(PaymentProvider.SIMULATOR), {
      state: PaymentCircuitBreakerState.OPEN,
      failureCount: String(PAYMENT_CIRCUIT_FAILURE_THRESHOLD),
      openedUntil: String(Date.now() + PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS),
      halfOpenTrialCount: '0',
      updatedAt: String(Date.now()),
    });

    await expect(
      circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR }),
    ).rejects.toThrow(PaymentProviderCircuitOpenError);
    await expect(circuit.acquireProviderCall({ provider: PaymentProvider.MOMO })).resolves.toMatchObject({
      state: PaymentCircuitBreakerState.CLOSED,
    });
  });

  it('fails closed when Redis is unavailable before provider calls', async () => {
    const redis = new FakeRedis();
    redis.fail = true;
    const circuit = new RedisPaymentCircuitBreaker(redis as never);

    await expect(circuit.acquireProviderCall({ provider: PaymentProvider.SIMULATOR })).rejects.toThrow(
      PaymentCircuitBreakerStoreUnavailableError,
    );
  });
});
