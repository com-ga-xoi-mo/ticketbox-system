import { Injectable } from '@nestjs/common';

import { UnsupportedPaymentProviderError } from '../domain/errors';
import { PaymentProvider } from '../domain/payment-provider.enum';
import type {
  CreatePaymentRedirectSessionData,
  MomoIpnPayload,
  PaymentGatewayPort,
  PaymentRedirectSession,
  PaymentSimulatorTokenPayload,
  VerifiedMomoIpnPayload,
} from '../domain/ports/payment-gateway.port';
import { MomoPaymentGateway } from './momo/momo-payment-gateway';
import { SimulatorPaymentGateway } from './simulator/simulator-payment-gateway';

@Injectable()
export class PaymentGatewayRegistry implements PaymentGatewayPort {
  constructor(
    private readonly simulatorGateway: SimulatorPaymentGateway,
    private readonly momoGateway: MomoPaymentGateway,
  ) {}

  createRedirectSession(
    data: CreatePaymentRedirectSessionData,
  ): PaymentRedirectSession | Promise<PaymentRedirectSession> {
    if (data.provider === PaymentProvider.SIMULATOR) {
      return this.simulatorGateway.createRedirectSession(data);
    }
    if (data.provider === PaymentProvider.MOMO) {
      return this.momoGateway.createRedirectSession(data);
    }

    throw new UnsupportedPaymentProviderError(data.provider);
  }

  verifySimulatorToken(token: string): PaymentSimulatorTokenPayload {
    return this.simulatorGateway.verifySimulatorToken(token);
  }

  verifyMomoIpnPayload(payload: MomoIpnPayload): VerifiedMomoIpnPayload {
    return this.momoGateway.verifyIpnPayload(payload);
  }
}
