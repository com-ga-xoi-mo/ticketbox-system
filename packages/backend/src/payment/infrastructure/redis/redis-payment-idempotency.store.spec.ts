import { describe, expect, it } from 'vitest';

import { Payment } from '../../domain/payment.entity';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
  type ClaimPaymentInitiationData,
} from '../../domain/ports/payment-idempotency.port';
import { PaymentIdempotencyStoreUnavailableError } from '../../domain/errors';
import { RedisPaymentIdempotencyStore } from './redis-payment-idempotency.store';

class FakeRedis {
  readonly values = new Map<string, string>();
  fail = false;

  async set(key: string, value: string, ...args: unknown[]): Promise<'OK' | null> {
    if (this.fail) {
      throw new Error('redis down');
    }

    const nx = args.includes('NX');
    if (nx && this.values.has(key)) {
      return null;
    }

    this.values.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    if (this.fail) {
      throw new Error('redis down');
    }

    return this.values.get(key) ?? null;
  }

  async del(key: string): Promise<number> {
    if (this.fail) {
      throw new Error('redis down');
    }

    return this.values.delete(key) ? 1 : 0;
  }
}

function buildClaim(overrides: Partial<ClaimPaymentInitiationData> = {}): ClaimPaymentInitiationData {
  return {
    userId: 'user-1',
    orderId: 'order-1',
    provider: PaymentProvider.SIMULATOR,
    idempotencyKey: 'pay-key-1',
    requestHash: 'hash-1',
    ttlSeconds: PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS,
    ...overrides,
  };
}

function buildPayment(): Payment {
  return new Payment({
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    provider: PaymentProvider.SIMULATOR,
    providerTransactionId: 'sim-payment-1',
    status: PaymentStatus.PENDING,
    amountVnd: 2400000,
    redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
    failureCode: null,
    failureMessage: null,
    createdAt: new Date('2026-06-19T10:01:00.000Z'),
    updatedAt: new Date('2026-06-19T10:01:00.000Z'),
    completedAt: null,
  });
}

describe('RedisPaymentIdempotencyStore', () => {
  it('claims a new payment initiation key once and returns in-progress for same hash', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);
    const claim = buildClaim();

    await expect(store.claimPaymentInitiation(claim)).resolves.toEqual({ status: 'CLAIMED' });
    await expect(store.claimPaymentInitiation(claim)).resolves.toEqual({ status: 'IN_PROGRESS' });
  });

  it('allows only one concurrent same-key claim', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);
    const claim = buildClaim();

    const results = await Promise.all([
      store.claimPaymentInitiation(claim),
      store.claimPaymentInitiation(claim),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['CLAIMED', 'IN_PROGRESS']);
  });

  it('rejects same idempotency key with a different request hash', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);

    await store.claimPaymentInitiation(buildClaim());

    await expect(
      store.claimPaymentInitiation(buildClaim({ orderId: 'order-2', requestHash: 'hash-2' })),
    ).resolves.toEqual({ status: 'MISMATCH' });
  });

  it('replays completed initiation response', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);
    const claim = buildClaim();

    await store.claimPaymentInitiation(claim);
    await store.completePaymentInitiation({
      ...claim,
      response: {
        payment: buildPayment(),
        redirectUrl: 'http://localhost:3000/payment-simulator/redirect?token=token',
        simulatorToken: 'token',
      },
    });

    const result = await store.claimPaymentInitiation(claim);

    expect(result.status).toBe('REPLAY');
    if (result.status === 'REPLAY') {
      expect(result.response.payment.id).toBe('payment-1');
      expect(result.response.simulatorToken).toBe('token');
    }
  });

  it('returns failed when a previous same-hash initiation was marked failed', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);
    const claim = buildClaim();

    await store.claimPaymentInitiation(claim);
    await store.failPaymentInitiation(claim);

    await expect(store.claimPaymentInitiation(claim)).resolves.toEqual({ status: 'FAILED' });
  });

  it('releases an in-progress claim when no provider call was made', async () => {
    const redis = new FakeRedis();
    const store = new RedisPaymentIdempotencyStore(redis as never);
    const claim = buildClaim();

    await store.claimPaymentInitiation(claim);
    await store.releasePaymentInitiation(claim);

    await expect(store.claimPaymentInitiation(claim)).resolves.toEqual({ status: 'CLAIMED' });
  });

  it('fails closed when Redis is unavailable', async () => {
    const redis = new FakeRedis();
    redis.fail = true;
    const store = new RedisPaymentIdempotencyStore(redis as never);

    await expect(store.claimPaymentInitiation(buildClaim())).rejects.toThrow(
      PaymentIdempotencyStoreUnavailableError,
    );
  });
});
