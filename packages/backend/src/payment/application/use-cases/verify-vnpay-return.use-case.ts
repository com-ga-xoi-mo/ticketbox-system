import type {
  PaymentGatewayPort,
  VerifiedVnpayCallbackPayload,
  VnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';

export class VerifyVnpayReturnUseCase {
  constructor(private readonly paymentGateway: PaymentGatewayPort) {}

  execute(payload: VnpayCallbackPayload): VerifiedVnpayCallbackPayload {
    return this.paymentGateway.verifyVnpayCallbackPayload(payload);
  }
}
