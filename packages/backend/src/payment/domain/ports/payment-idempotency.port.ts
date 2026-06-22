import type { Payment } from '../payment.entity';
import type { PaymentProvider } from '../payment-provider.enum';
import type { PaymentProviderMetadata } from './payment-gateway.port';

export const PAYMENT_IDEMPOTENCY = Symbol('PAYMENT_IDEMPOTENCY');

export const PAYMENT_INITIATION_IDEMPOTENCY_TTL_SECONDS = 60 * 60;

export interface InitiatedPaymentReplayResponse {
  payment: Payment;
  redirectUrl: string;
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}

export interface PaymentIdempotencyKey {
  userId: string;
  orderId: string;
  provider: PaymentProvider;
  idempotencyKey: string;
}

export interface ClaimPaymentInitiationData extends PaymentIdempotencyKey {
  requestHash: string;
  ttlSeconds: number;
}

export type ClaimPaymentInitiationResult =
  | { status: 'CLAIMED' }
  | { status: 'REPLAY'; response: InitiatedPaymentReplayResponse }
  | { status: 'IN_PROGRESS' }
  | { status: 'MISMATCH' }
  | { status: 'FAILED' };

export interface CompletePaymentInitiationData extends PaymentIdempotencyKey {
  requestHash: string;
  response: InitiatedPaymentReplayResponse;
  ttlSeconds: number;
}

export interface FailPaymentInitiationData extends PaymentIdempotencyKey {
  requestHash: string;
  ttlSeconds: number;
}

export interface ReleasePaymentInitiationData extends PaymentIdempotencyKey {
  requestHash: string;
}

export interface PaymentIdempotencyPort {
  claimPaymentInitiation(data: ClaimPaymentInitiationData): Promise<ClaimPaymentInitiationResult>;
  completePaymentInitiation(data: CompletePaymentInitiationData): Promise<void>;
  failPaymentInitiation(data: FailPaymentInitiationData): Promise<void>;
  releasePaymentInitiation(data: ReleasePaymentInitiationData): Promise<void>;
}
