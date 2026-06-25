import { createHmac } from 'crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvalidMomoIpnSignatureError, PaymentGatewayRequestError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import type { MomoIpnPayload } from '../../domain/ports/payment-gateway.port';
import { MomoPaymentGateway } from './momo-payment-gateway';

const config = {
  momoPartnerCode: 'MOMOUDLU20220629',
  momoAccessKey: 'ggoaaJa1ECRzBRYC',
  momoSecretKey: 'nI4o1MBg53oY5MWP3IHnYcxoUD2x2dm8',
  momoEndpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
  momoRequestType: 'captureWallet',
  momoReturnUrl: 'http://localhost:3000/payment-return',
  momoIpnUrl: 'https://example.ngrok-free.app/payments/momo/ipn',
};

function sign(rawSignature: string): string {
  return createHmac('sha256', config.momoSecretKey).update(rawSignature).digest('hex');
}

function buildIpnPayload(overrides: Partial<MomoIpnPayload> = {}): MomoIpnPayload {
  const overrideSignature = overrides.signature;
  const payload: MomoIpnPayload = {
    partnerCode: config.momoPartnerCode,
    orderId: 'payment-1',
    requestId: 'payment-1',
    amount: 2400000,
    orderInfo: 'TicketBox payment for order order-1',
    orderType: 'momo_wallet',
    transId: 123456,
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: 1780000000000,
    extraData: '',
    signature: '',
    ...overrides,
  };

  payload.signature =
    overrideSignature ??
    sign(
      `accessKey=${config.momoAccessKey}` +
        `&amount=${payload.amount}` +
        `&extraData=${payload.extraData ?? ''}` +
        `&message=${payload.message}` +
        `&orderId=${payload.orderId}` +
        `&orderInfo=${payload.orderInfo ?? ''}` +
        `&orderType=${payload.orderType ?? ''}` +
        `&partnerCode=${payload.partnerCode}` +
        `&payType=${payload.payType ?? ''}` +
        `&requestId=${payload.requestId}` +
        `&responseTime=${payload.responseTime}` +
        `&resultCode=${payload.resultCode}` +
        `&transId=${payload.transId ?? ''}`,
    );

  return payload;
}

describe('MomoPaymentGateway', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds and signs a MoMo create-payment request', async () => {
    const gateway = new MomoPaymentGateway(config as never);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCode: 0,
        orderId: 'payment-1',
        requestId: 'payment-1',
        payUrl: 'https://test-payment.momo.vn/pay',
        deeplink: 'momo://pay',
      }),
    } as Response);

    const session = await gateway.createRedirectSession({
      provider: PaymentProvider.MOMO,
      paymentId: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      amountVnd: 2400000,
    });

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    const expectedSignature = gateway.signCreatePaymentPayload({
      amount: 2400000,
      extraData: '',
      ipnUrl: config.momoIpnUrl,
      orderId: 'payment-1',
      orderInfo: 'TicketBox payment for order order-1',
      redirectUrl: config.momoReturnUrl,
      requestId: 'payment-1',
      requestType: config.momoRequestType,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      config.momoEndpoint,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(body).toMatchObject({
      partnerCode: config.momoPartnerCode,
      orderId: 'payment-1',
      requestId: 'payment-1',
      amount: 2400000,
      ipnUrl: config.momoIpnUrl,
      redirectUrl: config.momoReturnUrl,
      requestType: config.momoRequestType,
      signature: expectedSignature,
    });
    expect(session).toMatchObject({
      provider: PaymentProvider.MOMO,
      providerTransactionId: 'payment-1',
      redirectUrl: 'https://test-payment.momo.vn/pay',
      providerMetadata: {
        payUrl: 'https://test-payment.momo.vn/pay',
        deeplink: 'momo://pay',
      },
    });
  });

  it('maps MoMo create-payment failures to a gateway error', async () => {
    const gateway = new MomoPaymentGateway(config as never);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: 42, message: 'Rejected' }),
    } as Response);

    await expect(
      gateway.createRedirectSession({
        provider: PaymentProvider.MOMO,
        paymentId: 'payment-1',
        orderId: 'order-1',
        userId: 'user-1',
        amountVnd: 2400000,
      }),
    ).rejects.toThrow(PaymentGatewayRequestError);
  });

  it('verifies signed MoMo IPN payloads', () => {
    const gateway = new MomoPaymentGateway(config as never);
    const verified = gateway.verifyIpnPayload(buildIpnPayload());

    expect(verified).toMatchObject({
      providerTransactionId: 'payment-1',
      providerEventId: 'momo:payment-1:payment-1:123456:0',
      success: true,
      failureCode: null,
      failureMessage: null,
    });
  });

  it('rejects invalid MoMo IPN signatures', () => {
    const gateway = new MomoPaymentGateway(config as never);
    const payload = buildIpnPayload({ signature: 'bad-signature' });

    expect(() => gateway.verifyIpnPayload(payload)).toThrow(InvalidMomoIpnSignatureError);
  });
});
