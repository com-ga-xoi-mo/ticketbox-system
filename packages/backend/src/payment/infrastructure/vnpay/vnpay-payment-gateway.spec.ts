import { createHmac } from 'crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidVnpaySignatureError, InvalidVnpayTerminalError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import type { VnpayCallbackPayload } from '../../domain/ports/payment-gateway.port';
import { VnpayPaymentGateway } from './vnpay-payment-gateway';

const config = {
  vnpayTmnCode: 'TESTTMNCODE',
  vnpayHashSecret: 'test-vnpay-hash-secret',
  vnpayPaymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpayReturnUrl: 'https://example.test/payments/vnpay/return',
  vnpayIpnUrl: 'https://example.test/payments/vnpay/ipn',
  vnpayVersion: '2.1.0',
  vnpayCommand: 'pay',
  vnpayLocale: 'vn',
  vnpayOrderType: 'other',
  vnpayExpireMinutes: 15,
};

describe('VnpayPaymentGateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T03:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a sorted signed VNPay sandbox redirect URL', () => {
    const gateway = new VnpayPaymentGateway(config as never);
    const session = gateway.createRedirectSession({
      provider: PaymentProvider.VNPAY,
      paymentId: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      amountVnd: 1200000,
      clientIp: '::ffff:203.0.113.10',
    });
    const url = new URL(session.redirectUrl);
    const secureHash = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    const canonicalQuery = gateway.canonicalize(Object.fromEntries(url.searchParams.entries()));
    const expectedHash = createHmac('sha512', config.vnpayHashSecret)
      .update(canonicalQuery)
      .digest('hex');

    expect(url.origin + url.pathname).toBe(config.vnpayPaymentUrl);
    expect(url.searchParams.get('vnp_Amount')).toBe('120000000');
    expect(url.searchParams.get('vnp_CreateDate')).toBe('20260624100000');
    expect(url.searchParams.get('vnp_ExpireDate')).toBe('20260624101500');
    expect(url.searchParams.get('vnp_IpAddr')).toBe('203.0.113.10');
    expect(url.searchParams.get('vnp_TxnRef')).toBe('payment-1');
    expect(secureHash).toBe(expectedHash);
    expect(session).toMatchObject({
      provider: PaymentProvider.VNPAY,
      providerTransactionId: 'payment-1',
      providerMetadata: { vnpayTxnRef: 'payment-1' },
    });
  });

  it('canonicalizes parameters deterministically and encodes spaces as plus', () => {
    const gateway = new VnpayPaymentGateway(config as never);

    expect(
      gateway.canonicalize({
        vnp_TxnRef: 'payment 1',
        vnp_Amount: '10000',
        ignored: '',
      }),
    ).toBe('vnp_Amount=10000&vnp_TxnRef=payment+1');
  });

  it('verifies a signed VNPay callback and maps success', () => {
    const gateway = new VnpayPaymentGateway(config as never);
    const payload = buildSignedPayload(gateway);

    expect(gateway.verifyCallbackPayload(payload)).toMatchObject({
      providerTransactionId: 'payment-1',
      providerPaymentId: '123456',
      amountVnd: 1200000,
      responseCode: '00',
      transactionStatus: '00',
      success: true,
      failureCode: null,
    });
  });

  it('rejects an invalid VNPay callback signature', () => {
    const gateway = new VnpayPaymentGateway(config as never);

    expect(() =>
      gateway.verifyCallbackPayload({
        ...buildSignedPayload(gateway),
        vnp_SecureHash: 'invalid',
      }),
    ).toThrow(InvalidVnpaySignatureError);
  });

  it('rejects a signed callback for a different terminal', () => {
    const gateway = new VnpayPaymentGateway(config as never);
    const payload = buildSignedPayload(gateway, { vnp_TmnCode: 'OTHERTERMINAL' });

    expect(() => gateway.verifyCallbackPayload(payload)).toThrow(InvalidVnpayTerminalError);
  });
});

function buildSignedPayload(
  gateway: VnpayPaymentGateway,
  overrides: VnpayCallbackPayload = {},
): VnpayCallbackPayload {
  const payload: VnpayCallbackPayload = {
    vnp_Amount: '120000000',
    vnp_BankCode: 'NCB',
    vnp_PayDate: '20260624100200',
    vnp_ResponseCode: '00',
    vnp_TmnCode: config.vnpayTmnCode,
    vnp_TransactionNo: '123456',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: 'payment-1',
    ...overrides,
  };
  payload.vnp_SecureHash = createHmac('sha512', config.vnpayHashSecret)
    .update(gateway.canonicalize(payload))
    .digest('hex');
  return payload;
}
