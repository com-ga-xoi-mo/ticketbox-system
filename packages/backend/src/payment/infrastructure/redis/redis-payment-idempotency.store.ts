import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';
import { Payment } from '../../domain/payment.entity';
import { PaymentStatus } from '../../domain/payment-status.enum';
import { PaymentIdempotencyStoreUnavailableError } from '../../domain/errors';
import type {
  ClaimPaymentInitiationData,
  ClaimPaymentInitiationResult,
  CompletePaymentInitiationData,
  FailPaymentInitiationData,
  InitiatedPaymentReplayResponse,
  PaymentIdempotencyKey,
  PaymentIdempotencyPort,
  ReleasePaymentInitiationData,
} from '../../domain/ports/payment-idempotency.port';
import type { PaymentProviderMetadata } from '../../domain/ports/payment-gateway.port';

type StoredPaymentInitiationStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

interface StoredPayment {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amountVnd: number;
  redirectUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface StoredInitiatedPaymentResponse {
  payment: StoredPayment;
  redirectUrl: string;
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}

interface StoredPaymentInitiationRecord {
  status: StoredPaymentInitiationStatus;
  requestHash: string;
  resourceType: 'payment';
  resourceId: string | null;
  responseBody?: StoredInitiatedPaymentResponse;
  expiresAt: string;
}

@Injectable()
export class RedisPaymentIdempotencyStore implements PaymentIdempotencyPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async claimPaymentInitiation(
    data: ClaimPaymentInitiationData,
  ): Promise<ClaimPaymentInitiationResult> {
    const key = this.buildPaymentInitiationKey(data);
    const record: StoredPaymentInitiationRecord = {
      status: 'IN_PROGRESS',
      requestHash: data.requestHash,
      resourceType: 'payment',
      resourceId: null,
      expiresAt: this.expiresAt(data.ttlSeconds),
    };

    try {
      const result = await this.redis.set(
        key,
        JSON.stringify(record),
        'EX',
        data.ttlSeconds,
        'NX',
      );

      if (result === 'OK') {
        return { status: 'CLAIMED' };
      }

      const existing = await this.getRecord(key);

      if (!existing || existing.requestHash !== data.requestHash) {
        return { status: 'MISMATCH' };
      }

      if (existing.status === 'COMPLETED' && existing.responseBody) {
        return {
          status: 'REPLAY',
          response: this.fromStoredResponse(existing.responseBody),
        };
      }

      if (existing.status === 'FAILED') {
        return { status: 'FAILED' };
      }

      return { status: 'IN_PROGRESS' };
    } catch (err: unknown) {
      throw this.toStoreError(err);
    }
  }

  async completePaymentInitiation(data: CompletePaymentInitiationData): Promise<void> {
    const key = this.buildPaymentInitiationKey(data);
    const record: StoredPaymentInitiationRecord = {
      status: 'COMPLETED',
      requestHash: data.requestHash,
      resourceType: 'payment',
      resourceId: data.response.payment.id,
      responseBody: this.toStoredResponse(data.response),
      expiresAt: this.expiresAt(data.ttlSeconds),
    };

    await this.setRecord(key, record, data.ttlSeconds);
  }

  async failPaymentInitiation(data: FailPaymentInitiationData): Promise<void> {
    const key = this.buildPaymentInitiationKey(data);
    const record: StoredPaymentInitiationRecord = {
      status: 'FAILED',
      requestHash: data.requestHash,
      resourceType: 'payment',
      resourceId: null,
      expiresAt: this.expiresAt(data.ttlSeconds),
    };

    await this.setRecord(key, record, data.ttlSeconds);
  }

  async releasePaymentInitiation(data: ReleasePaymentInitiationData): Promise<void> {
    const key = this.buildPaymentInitiationKey(data);

    try {
      const existing = await this.getRecord(key);

      if (existing?.status === 'IN_PROGRESS' && existing.requestHash === data.requestHash) {
        await this.redis.del(key);
      }
    } catch (err: unknown) {
      throw this.toStoreError(err);
    }
  }

  private async setRecord(
    key: string,
    record: StoredPaymentInitiationRecord,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(record), 'EX', ttlSeconds);
    } catch (err: unknown) {
      throw this.toStoreError(err);
    }
  }

  private async getRecord(key: string): Promise<StoredPaymentInitiationRecord | null> {
    const raw = await this.redis.get(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredPaymentInitiationRecord;
    } catch {
      throw new PaymentIdempotencyStoreUnavailableError(
        'Payment idempotency record is corrupted',
      );
    }
  }

  private buildPaymentInitiationKey(data: PaymentIdempotencyKey): string {
    return [
      'ticketbox',
      'idempotency',
      'payment',
      'initiate',
      data.userId,
      encodeURIComponent(data.idempotencyKey),
    ].join(':');
  }

  private expiresAt(ttlSeconds: number): string {
    return new Date(Date.now() + ttlSeconds * 1000).toISOString();
  }

  private toStoredResponse(response: InitiatedPaymentReplayResponse): StoredInitiatedPaymentResponse {
    return {
      payment: {
        id: response.payment.id,
        orderId: response.payment.orderId,
        userId: response.payment.userId,
        provider: response.payment.provider,
        providerTransactionId: response.payment.providerTransactionId,
        status: response.payment.status,
        amountVnd: response.payment.amountVnd,
        redirectUrl: response.payment.redirectUrl,
        failureCode: response.payment.failureCode,
        failureMessage: response.payment.failureMessage,
        createdAt: response.payment.createdAt.toISOString(),
        updatedAt: response.payment.updatedAt.toISOString(),
        completedAt: response.payment.completedAt?.toISOString() ?? null,
      },
      redirectUrl: response.redirectUrl,
      simulatorToken: response.simulatorToken,
      providerMetadata: response.providerMetadata,
    };
  }

  private fromStoredResponse(response: StoredInitiatedPaymentResponse): InitiatedPaymentReplayResponse {
    return {
      payment: new Payment({
        id: response.payment.id,
        orderId: response.payment.orderId,
        userId: response.payment.userId,
        provider: response.payment.provider,
        providerTransactionId: response.payment.providerTransactionId,
        status: response.payment.status,
        amountVnd: response.payment.amountVnd,
        redirectUrl: response.payment.redirectUrl,
        failureCode: response.payment.failureCode,
        failureMessage: response.payment.failureMessage,
        createdAt: new Date(response.payment.createdAt),
        updatedAt: new Date(response.payment.updatedAt),
        completedAt: response.payment.completedAt ? new Date(response.payment.completedAt) : null,
      }),
      redirectUrl: response.redirectUrl,
      simulatorToken: response.simulatorToken,
      providerMetadata: response.providerMetadata,
    };
  }

  private toStoreError(err: unknown): PaymentIdempotencyStoreUnavailableError {
    if (err instanceof PaymentIdempotencyStoreUnavailableError) {
      return err;
    }

    const message = err instanceof Error ? err.message : 'Payment idempotency store is unavailable';

    return new PaymentIdempotencyStoreUnavailableError(message);
  }
}
