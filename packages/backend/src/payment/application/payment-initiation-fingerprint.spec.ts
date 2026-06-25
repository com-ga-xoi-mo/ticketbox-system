import { describe, expect, it } from 'vitest';

import { PaymentProvider } from '../domain/payment-provider.enum';
import { createPaymentInitiationRequestHash } from './payment-initiation-fingerprint';

describe('createPaymentInitiationRequestHash', () => {
  it('returns a stable hash for the same normalized payment initiation request', () => {
    const input = {
      userId: 'user-1',
      orderId: 'order-1',
      provider: PaymentProvider.SIMULATOR,
    };

    expect(createPaymentInitiationRequestHash(input)).toBe(
      createPaymentInitiationRequestHash({ ...input }),
    );
  });

  it('changes hash when order or provider changes', () => {
    const base = createPaymentInitiationRequestHash({
      userId: 'user-1',
      orderId: 'order-1',
      provider: PaymentProvider.SIMULATOR,
    });

    expect(
      createPaymentInitiationRequestHash({
        userId: 'user-1',
        orderId: 'order-2',
        provider: PaymentProvider.SIMULATOR,
      }),
    ).not.toBe(base);
    expect(
      createPaymentInitiationRequestHash({
        userId: 'user-1',
        orderId: 'order-1',
        provider: PaymentProvider.MOMO,
      }),
    ).not.toBe(base);
    expect(
      createPaymentInitiationRequestHash({
        userId: 'user-1',
        orderId: 'order-1',
        provider: PaymentProvider.VNPAY,
      }),
    ).not.toBe(base);
  });
});
