export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CreatePaymentRedirectSessionData {
  paymentId: string;
  orderId: string;
  userId: string;
  amountVnd: number;
}

export interface PaymentRedirectSession {
  provider: string;
  providerTransactionId: string;
  redirectUrl: string;
  simulatorToken: string;
}

export interface PaymentSimulatorTokenPayload {
  paymentId: string;
  orderId: string;
  userId: string;
  providerTransactionId: string;
}

export interface PaymentGatewayPort {
  createRedirectSession(data: CreatePaymentRedirectSessionData): PaymentRedirectSession;

  verifySimulatorToken(token: string): PaymentSimulatorTokenPayload;
}
