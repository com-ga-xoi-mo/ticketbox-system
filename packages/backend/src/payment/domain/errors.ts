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

export class InvalidMomoIpnSignatureError extends Error {
  constructor() {
    super('Invalid MoMo IPN signature');
    this.name = 'InvalidMomoIpnSignatureError';
  }
}

export function isFinalSimulatorOutcome(outcome: PaymentSimulatorOutcome): boolean {
  return [PaymentSimulatorOutcome.SUCCESS, PaymentSimulatorOutcome.FAILURE].includes(outcome);
}
