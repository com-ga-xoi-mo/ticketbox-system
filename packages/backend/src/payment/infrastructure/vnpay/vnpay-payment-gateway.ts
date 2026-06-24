import { createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { InvalidVnpaySignatureError, InvalidVnpayTerminalError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import type {
  CreatePaymentRedirectSessionData,
  PaymentRedirectSession,
  VerifiedVnpayCallbackPayload,
  VnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';

const VNPAY_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

@Injectable()
export class VnpayPaymentGateway {
  constructor(private readonly config: PlatformConfigService) {}

  createRedirectSession(data: CreatePaymentRedirectSessionData): PaymentRedirectSession {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.config.vnpayExpireMinutes * 60 * 1000);
    const params: VnpayCallbackPayload = {
      vnp_Amount: String(data.amountVnd * 100),
      vnp_Command: this.config.vnpayCommand,
      vnp_CreateDate: this.formatVnpayDate(createdAt),
      vnp_CurrCode: 'VND',
      vnp_ExpireDate: this.formatVnpayDate(expiresAt),
      vnp_IpAddr: this.normalizeIp(data.clientIp),
      vnp_Locale: this.config.vnpayLocale,
      vnp_OrderInfo: `TicketBox payment for order ${data.orderId}`,
      vnp_OrderType: this.config.vnpayOrderType,
      vnp_ReturnUrl: this.config.vnpayReturnUrl,
      vnp_TmnCode: this.config.vnpayTmnCode,
      vnp_TxnRef: data.paymentId,
      vnp_Version: this.config.vnpayVersion,
    };
    const canonicalQuery = this.canonicalize(params);
    const secureHash = this.sign(canonicalQuery);
    const redirectUrl = `${this.config.vnpayPaymentUrl}?${canonicalQuery}&vnp_SecureHash=${secureHash}`;

    return {
      provider: PaymentProvider.VNPAY,
      providerTransactionId: data.paymentId,
      redirectUrl,
      providerMetadata: {
        payUrl: redirectUrl,
        vnpayTxnRef: data.paymentId,
      },
    };
  }

  verifyCallbackPayload(payload: VnpayCallbackPayload): VerifiedVnpayCallbackPayload {
    const actualSignature = payload.vnp_SecureHash ?? '';
    const signedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType',
      ),
    );
    const expectedSignature = this.sign(this.canonicalize(signedPayload));

    if (!this.safeEquals(actualSignature.toLowerCase(), expectedSignature.toLowerCase())) {
      throw new InvalidVnpaySignatureError();
    }
    if (payload.vnp_TmnCode !== this.config.vnpayTmnCode) {
      throw new InvalidVnpayTerminalError();
    }

    const providerTransactionId = payload.vnp_TxnRef ?? '';
    const responseCode = payload.vnp_ResponseCode ?? '';
    const transactionStatus = payload.vnp_TransactionStatus ?? '';
    const providerPaymentId = payload.vnp_TransactionNo || null;
    const payDate = payload.vnp_PayDate ?? 'none';
    const amountVnd = Number(payload.vnp_Amount) / 100;
    const success = responseCode === '00' && transactionStatus === '00';

    return {
      payload: { ...payload },
      providerTransactionId,
      providerEventId: [
        'vnpay',
        providerTransactionId,
        providerPaymentId ?? 'none',
        responseCode || 'none',
        transactionStatus || 'none',
        payDate,
      ].join(':'),
      providerPaymentId,
      amountVnd,
      responseCode,
      transactionStatus,
      success,
      failureCode: success ? null : responseCode || transactionStatus || 'UNKNOWN',
      failureMessage: success
        ? null
        : `VNPay payment failed (${responseCode || 'unknown'}/${transactionStatus || 'unknown'})`,
    };
  }

  canonicalize(params: VnpayCallbackPayload): string {
    return Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${this.encode(key)}=${this.encode(String(value))}`)
      .join('&');
  }

  formatVnpayDate(date: Date): string {
    const local = new Date(date.getTime() + VNPAY_TIMEZONE_OFFSET_MS);
    return [
      local.getUTCFullYear(),
      String(local.getUTCMonth() + 1).padStart(2, '0'),
      String(local.getUTCDate()).padStart(2, '0'),
      String(local.getUTCHours()).padStart(2, '0'),
      String(local.getUTCMinutes()).padStart(2, '0'),
      String(local.getUTCSeconds()).padStart(2, '0'),
    ].join('');
  }

  private normalizeIp(value?: string): string {
    if (!value) return '127.0.0.1';
    if (value.startsWith('::ffff:')) return value.slice(7);
    if (value === '::1') return '127.0.0.1';
    return value.split(',')[0].trim();
  }

  private encode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  private sign(value: string): string {
    return createHmac('sha512', this.config.vnpayHashSecret).update(value).digest('hex');
  }

  private safeEquals(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
