import type { Payment } from '../../domain/payment.entity';
import type { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    provider: payment.provider,
    providerTransactionId: payment.providerTransactionId,
    status: payment.status,
    amountVnd: payment.amountVnd,
    redirectUrl: payment.redirectUrl,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    completedAt: payment.completedAt?.toISOString() ?? null,
  };
}

export function serializeInitiatedPayment(params: {
  payment: Payment;
  redirectUrl: string;
  simulatorToken: string;
}) {
  return {
    payment: serializePayment(params.payment),
    redirectUrl: params.redirectUrl,
    simulatorToken: params.simulatorToken,
  };
}

export function serializeSimulatorCallbackResult(params: {
  payment: Payment;
  outcome: PaymentSimulatorOutcome;
  duplicate: boolean;
  orderTransitioned: boolean;
}) {
  return {
    payment: serializePayment(params.payment),
    outcome: params.outcome,
    duplicate: params.duplicate,
    orderTransitioned: params.orderTransitioned,
  };
}
