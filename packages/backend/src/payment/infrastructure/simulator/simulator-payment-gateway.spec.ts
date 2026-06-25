import { describe, expect, it } from 'vitest';

import { InvalidPaymentSimulatorTokenError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { SimulatorPaymentGateway } from './simulator-payment-gateway';

describe('SimulatorPaymentGateway', () => {
  const config = {
    jwtSecret: 'test-secret',
    port: 3000,
  };

  it('creates a signed local redirect session', () => {
    const gateway = new SimulatorPaymentGateway(config as never);

    const session = gateway.createRedirectSession({
      provider: PaymentProvider.SIMULATOR,
      paymentId: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      amountVnd: 2400000,
    });

    expect(session.provider).toBe('SIMULATOR');
    expect(session.providerTransactionId).toBe('sim-payment-1');
    expect(session.redirectUrl).toContain('http://localhost:3000/payment-simulator/redirect');
    expect(session.simulatorToken).toBeDefined();
    expect(gateway.verifySimulatorToken(session.simulatorToken!)).toMatchObject({
      paymentId: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      providerTransactionId: 'sim-payment-1',
    });
  });

  it('rejects tampered tokens', () => {
    const gateway = new SimulatorPaymentGateway(config as never);
    const session = gateway.createRedirectSession({
      provider: PaymentProvider.SIMULATOR,
      paymentId: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      amountVnd: 2400000,
    });

    expect(() => gateway.verifySimulatorToken(`${session.simulatorToken}x`)).toThrow(
      InvalidPaymentSimulatorTokenError,
    );
  });
});
