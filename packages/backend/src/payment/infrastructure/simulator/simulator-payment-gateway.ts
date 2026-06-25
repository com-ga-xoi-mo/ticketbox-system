import { createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { InvalidPaymentSimulatorTokenError } from '../../domain/errors';
import type {
  CreatePaymentRedirectSessionData,
  MomoIpnPayload,
  PaymentGatewayPort,
  PaymentRedirectSession,
  PaymentSimulatorTokenPayload,
  VerifiedMomoIpnPayload,
  VerifiedVnpayCallbackPayload,
  VnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';
import { PaymentProvider } from '../../domain/payment-provider.enum';

const PROVIDER = PaymentProvider.SIMULATOR;

interface SignedSimulatorTokenPayload extends PaymentSimulatorTokenPayload {
  iat: number;
}

@Injectable()
export class SimulatorPaymentGateway implements PaymentGatewayPort {
  constructor(private readonly config: PlatformConfigService) {}

  createRedirectSession(data: CreatePaymentRedirectSessionData): PaymentRedirectSession {
    if (data.provider !== PaymentProvider.SIMULATOR) {
      throw new Error(`Simulator gateway cannot handle provider: ${data.provider}`);
    }

    const providerTransactionId = `sim-${data.paymentId}`;
    const simulatorToken = this.sign({
      paymentId: data.paymentId,
      orderId: data.orderId,
      userId: data.userId,
      providerTransactionId,
      iat: Math.floor(Date.now() / 1000),
    });

    return {
      provider: PROVIDER,
      providerTransactionId,
      simulatorToken,
      redirectUrl: `http://localhost:${this.config.port}/payment-simulator/redirect?token=${simulatorToken}`,
      providerMetadata: { simulatorToken },
    };
  }

  verifySimulatorToken(token: string): PaymentSimulatorTokenPayload {
    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) {
      throw new InvalidPaymentSimulatorTokenError();
    }

    const expectedSignature = this.signPayloadPart(payloadPart);
    if (!this.safeEquals(signature, expectedSignature)) {
      throw new InvalidPaymentSimulatorTokenError();
    }

    try {
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as Partial<SignedSimulatorTokenPayload>;

      if (
        typeof payload.paymentId !== 'string' ||
        typeof payload.orderId !== 'string' ||
        typeof payload.userId !== 'string' ||
        typeof payload.providerTransactionId !== 'string'
      ) {
        throw new InvalidPaymentSimulatorTokenError();
      }

      return {
        paymentId: payload.paymentId,
        orderId: payload.orderId,
        userId: payload.userId,
        providerTransactionId: payload.providerTransactionId,
      };
    } catch (err: unknown) {
      if (err instanceof InvalidPaymentSimulatorTokenError) {
        throw err;
      }
      throw new InvalidPaymentSimulatorTokenError();
    }
  }

  verifyMomoIpnPayload(_payload: MomoIpnPayload): VerifiedMomoIpnPayload {
    void _payload;
    throw new Error('Simulator gateway cannot verify MoMo IPN payloads');
  }

  verifyVnpayCallbackPayload(_payload: VnpayCallbackPayload): VerifiedVnpayCallbackPayload {
    void _payload;
    throw new Error('Simulator gateway cannot verify VNPay callback payloads');
  }

  private sign(payload: SignedSimulatorTokenPayload): string {
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${payloadPart}.${this.signPayloadPart(payloadPart)}`;
  }

  private signPayloadPart(payloadPart: string): string {
    return createHmac('sha256', this.config.jwtSecret).update(payloadPart).digest('base64url');
  }

  private safeEquals(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
