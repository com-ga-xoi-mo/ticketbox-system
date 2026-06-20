import { createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { InvalidMomoIpnSignatureError, PaymentGatewayRequestError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import type {
  CreatePaymentRedirectSessionData,
  MomoIpnPayload,
  PaymentRedirectSession,
  VerifiedMomoIpnPayload,
} from '../../domain/ports/payment-gateway.port';

interface MomoCreatePaymentResponse {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: number;
  responseTime?: number;
  message?: string;
  resultCode?: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  [key: string]: unknown;
}

@Injectable()
export class MomoPaymentGateway {
  constructor(private readonly config: PlatformConfigService) {}

  async createRedirectSession(
    data: CreatePaymentRedirectSessionData,
  ): Promise<PaymentRedirectSession> {
    const requestId = data.paymentId;
    const orderId = data.paymentId;
    const orderInfo = `TicketBox payment for order ${data.orderId}`;
    const extraData = '';

    const payload = {
      partnerCode: this.config.momoPartnerCode,
      partnerName: 'TicketBox',
      storeId: 'TicketBoxStore',
      requestId,
      amount: data.amountVnd,
      orderId,
      orderInfo,
      redirectUrl: this.config.momoReturnUrl,
      ipnUrl: this.config.momoIpnUrl,
      lang: 'vi',
      requestType: this.config.momoRequestType,
      autoCapture: true,
      extraData,
      signature: this.signCreatePaymentPayload({
        amount: data.amountVnd,
        extraData,
        ipnUrl: this.config.momoIpnUrl,
        orderId,
        orderInfo,
        redirectUrl: this.config.momoReturnUrl,
        requestId,
        requestType: this.config.momoRequestType,
      }),
    };

    const response = await this.postCreatePayment(payload);
    if (response.resultCode !== 0 || !response.payUrl) {
      throw new PaymentGatewayRequestError(
        PaymentProvider.MOMO,
        response.message ?? `MoMo resultCode ${response.resultCode ?? 'unknown'}`,
      );
    }

    return {
      provider: PaymentProvider.MOMO,
      providerTransactionId: response.orderId ?? orderId,
      redirectUrl: response.payUrl,
      providerMetadata: {
        payUrl: response.payUrl,
        deeplink: response.deeplink,
        qrCodeUrl: response.qrCodeUrl,
        rawResponse: response,
      },
    };
  }

  verifyIpnPayload(payload: MomoIpnPayload): VerifiedMomoIpnPayload {
    const expectedSignature = this.signMomoIpnPayload(payload);
    if (!this.safeEquals(payload.signature, expectedSignature)) {
      throw new InvalidMomoIpnSignatureError();
    }

    const success = Number(payload.resultCode) === 0;
    const providerTransactionId = String(payload.orderId);
    const transId = payload.transId === undefined ? 'none' : String(payload.transId);

    return {
      ...payload,
      providerTransactionId,
      providerEventId: `momo:${providerTransactionId}:${payload.requestId}:${transId}:${payload.resultCode}`,
      success,
      failureCode: success ? null : String(payload.resultCode),
      failureMessage: success ? null : payload.message,
    };
  }

  signCreatePaymentPayload(params: {
    amount: number;
    extraData: string;
    ipnUrl: string;
    orderId: string;
    orderInfo: string;
    redirectUrl: string;
    requestId: string;
    requestType: string;
  }): string {
    const rawSignature =
      `accessKey=${this.config.momoAccessKey}` +
      `&amount=${params.amount}` +
      `&extraData=${params.extraData}` +
      `&ipnUrl=${params.ipnUrl}` +
      `&orderId=${params.orderId}` +
      `&orderInfo=${params.orderInfo}` +
      `&partnerCode=${this.config.momoPartnerCode}` +
      `&redirectUrl=${params.redirectUrl}` +
      `&requestId=${params.requestId}` +
      `&requestType=${params.requestType}`;

    return this.sign(rawSignature);
  }

  signMomoIpnPayload(payload: MomoIpnPayload): string {
    const rawSignature =
      `accessKey=${this.config.momoAccessKey}` +
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
      `&transId=${payload.transId ?? ''}`;

    return this.sign(rawSignature);
  }

  private async postCreatePayment(
    payload: Record<string, unknown>,
  ): Promise<MomoCreatePaymentResponse> {
    const response = await fetch(this.config.momoEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as MomoCreatePaymentResponse;

    if (!response.ok) {
      throw new PaymentGatewayRequestError(
        PaymentProvider.MOMO,
        body.message ?? `HTTP ${response.status}`,
      );
    }

    return body;
  }

  private sign(rawSignature: string): string {
    return createHmac('sha256', this.config.momoSecretKey).update(rawSignature).digest('hex');
  }

  private safeEquals(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
