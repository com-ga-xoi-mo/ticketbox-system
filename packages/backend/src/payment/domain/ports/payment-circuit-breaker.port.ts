import type { PaymentProvider } from '../payment-provider.enum';

export const PAYMENT_CIRCUIT_BREAKER = Symbol('PAYMENT_CIRCUIT_BREAKER');

export enum PaymentCircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export const PAYMENT_CIRCUIT_FAILURE_THRESHOLD = 3;
export const PAYMENT_CIRCUIT_OPEN_COOLDOWN_MS = 30_000;
export const PAYMENT_CIRCUIT_HALF_OPEN_MAX_TRIALS = 1;

export interface PaymentCircuitBreakerPermit {
  provider: PaymentProvider;
  state: PaymentCircuitBreakerState.CLOSED | PaymentCircuitBreakerState.HALF_OPEN;
}

export interface AcquirePaymentProviderCallData {
  provider: PaymentProvider;
}

export interface RecordPaymentProviderCallData {
  provider: PaymentProvider;
  permit: PaymentCircuitBreakerPermit;
}

export interface PaymentCircuitBreakerPort {
  acquireProviderCall(data: AcquirePaymentProviderCallData): Promise<PaymentCircuitBreakerPermit>;
  recordProviderCallSuccess(data: RecordPaymentProviderCallData): Promise<void>;
  recordProviderCallFailure(data: RecordPaymentProviderCallData): Promise<void>;
}
