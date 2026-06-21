import type { Payment } from '../../domain/payment.entity';
import type { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import type {
  PaymentProviderMetadata,
  VerifiedMomoIpnPayload,
} from '../../domain/ports/payment-gateway.port';

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
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}) {
  return {
    payment: serializePayment(params.payment),
    redirectUrl: params.redirectUrl,
    simulatorToken: params.simulatorToken ?? null,
    providerMetadata: params.providerMetadata ?? null,
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

export function serializeMomoIpnResult(params: {
  payment: Payment;
  momo: VerifiedMomoIpnPayload;
  duplicate: boolean;
  orderTransitioned: boolean;
}) {
  return {
    partnerCode: params.momo.partnerCode,
    orderId: params.momo.orderId,
    requestId: params.momo.requestId,
    resultCode: 0,
    message: params.duplicate ? 'Duplicate callback ignored' : 'Callback processed',
    payment: serializePayment(params.payment),
    duplicate: params.duplicate,
    orderTransitioned: params.orderTransitioned,
  };
}
