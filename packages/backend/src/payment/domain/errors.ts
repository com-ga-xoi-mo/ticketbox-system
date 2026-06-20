import { PaymentSimulatorOutcome } from './payment-simulator-outcome.enum';

export class PaymentNotFoundError extends Error {
  constructor(public readonly paymentId: string) {
    super(`Payment not found: ${paymentId}`);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentOrderNotPendingError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly status: string,
  ) {
    super(`Order ${orderId} is not pending payment: ${status}`);
    this.name = 'PaymentOrderNotPendingError';
  }
}

export class InvalidPaymentSimulatorTokenError extends Error {
  constructor() {
    super('Invalid payment simulator token');
    this.name = 'InvalidPaymentSimulatorTokenError';
  }
}

export class UnsupportedPaymentSimulatorOutcomeError extends Error {
  constructor(public readonly outcome: string) {
    super(`Unsupported payment simulator outcome: ${outcome}`);
    this.name = 'UnsupportedPaymentSimulatorOutcomeError';
  }
}

export class PaymentCallbackMismatchError extends Error {
  constructor(public readonly paymentId: string) {
    super(`Payment callback does not match payment: ${paymentId}`);
    this.name = 'PaymentCallbackMismatchError';
  }
}

export class UnsupportedPaymentProviderError extends Error {
  constructor(public readonly provider: string) {
    super(`Unsupported payment provider: ${provider}`);
    this.name = 'UnsupportedPaymentProviderError';
  }
}

export class PaymentGatewayRequestError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
  ) {
    super(`${provider} payment gateway request failed: ${message}`);
    this.name = 'PaymentGatewayRequestError';
  }
}

export class PaymentProviderCircuitOpenError extends Error {
  constructor(
    public readonly provider: string,
    public readonly retryAfterMs?: number,
  ) {
    super(
      retryAfterMs === undefined
        ? `${provider} payment provider circuit is open`
        : `${provider} payment provider circuit is open; retry after ${retryAfterMs}ms`,
    );
    this.name = 'PaymentProviderCircuitOpenError';
  }
}

export class PaymentProviderHalfOpenTrialRejectedError extends Error {
  constructor(public readonly provider: string) {
    super(`${provider} payment provider circuit is half-open; trial limit reached`);
    this.name = 'PaymentProviderHalfOpenTrialRejectedError';
  }
}

export class PaymentCircuitBreakerStoreUnavailableError extends Error {
  constructor(message = 'Payment circuit breaker store is unavailable') {
    super(message);
    this.name = 'PaymentCircuitBreakerStoreUnavailableError';
  }
}

export class InvalidMomoIpnSignatureError extends Error {
  constructor() {
    super('Invalid MoMo IPN signature');
    this.name = 'InvalidMomoIpnSignatureError';
  }
}

export class PaymentIdempotencyKeyMismatchError extends Error {
  constructor() {
    super('Payment initiation idempotency key was reused with a different request');
    this.name = 'PaymentIdempotencyKeyMismatchError';
  }
}

export class PaymentInitiationInProgressError extends Error {
  constructor() {
    super('Payment initiation is already in progress for this idempotency key');
    this.name = 'PaymentInitiationInProgressError';
  }
}

export class PaymentIdempotencyStoreUnavailableError extends Error {
  constructor(message = 'Payment idempotency store is unavailable') {
    super(message);
    this.name = 'PaymentIdempotencyStoreUnavailableError';
  }
}

export class PaymentInitiationPreviouslyFailedError extends Error {
  constructor() {
    super('Payment initiation previously failed for this idempotency key; retry with a new key');
    this.name = 'PaymentInitiationPreviouslyFailedError';
  }
}

export function isFinalSimulatorOutcome(outcome: PaymentSimulatorOutcome): boolean {
  return [PaymentSimulatorOutcome.SUCCESS, PaymentSimulatorOutcome.FAILURE].includes(outcome);
}
