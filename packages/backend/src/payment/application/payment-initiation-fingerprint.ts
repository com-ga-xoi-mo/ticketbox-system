import { createHash } from 'crypto';

import type { PaymentProvider } from '../domain/payment-provider.enum';

export interface PaymentInitiationFingerprintInput {
  userId: string;
  orderId: string;
  provider: PaymentProvider;
}

export function createPaymentInitiationRequestHash(
  input: PaymentInitiationFingerprintInput,
): string {
  const normalized = {
    orderId: input.orderId,
    provider: input.provider,
    userId: input.userId,
  };

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
