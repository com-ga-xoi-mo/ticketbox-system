import type { PaymentProvider } from '../payment-provider.enum';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CreatePaymentRedirectSessionData {
  provider: PaymentProvider;
  paymentId: string;
  orderId: string;
  userId: string;
  amountVnd: number;
  returnUrl?: string;
  clientIp?: string;
}

export interface PaymentProviderMetadata {
  simulatorToken?: string;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  vnpayTxnRef?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentRedirectSession {
  provider: PaymentProvider;
  providerTransactionId: string;
  redirectUrl: string;
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}

export interface PaymentSimulatorTokenPayload {
  paymentId: string;
  orderId: string;
  userId: string;
  providerTransactionId: string;
}

export interface MomoIpnPayload {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo?: string;
  orderType?: string;
  transId?: number | string;
  resultCode: number;
  message: string;
  payType?: string;
  responseTime: number;
  extraData?: string;
  signature: string;
  [key: string]: unknown;
}

export interface VerifiedMomoIpnPayload extends MomoIpnPayload {
  providerTransactionId: string;
  providerEventId: string;
  success: boolean;
  failureCode: string | null;
  failureMessage: string | null;
}

export type VnpayCallbackPayload = Record<string, string>;

export interface VerifiedVnpayCallbackPayload {
  payload: VnpayCallbackPayload;
  providerTransactionId: string;
  providerEventId: string;
  providerPaymentId: string | null;
  amountVnd: number;
  responseCode: string;
  transactionStatus: string;
  success: boolean;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface PaymentGatewayPort {
  createRedirectSession(
    data: CreatePaymentRedirectSessionData,
  ): PaymentRedirectSession | Promise<PaymentRedirectSession>;

  verifySimulatorToken(token: string): PaymentSimulatorTokenPayload;

  verifyMomoIpnPayload(payload: MomoIpnPayload): VerifiedMomoIpnPayload;

  verifyVnpayCallbackPayload(payload: VnpayCallbackPayload): VerifiedVnpayCallbackPayload;
}
