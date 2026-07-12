import type {
  PaymentGatewayPort,
  VerifiedVnpayCallbackPayload,
  VnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { PaymentNotFoundError } from '../../domain/errors';

export class VerifyVnpayReturnUseCase {
  constructor(
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  async execute(
    payload: VnpayCallbackPayload,
  ): Promise<VerifiedVnpayCallbackPayload & { orderId: string }> {
    const verified = this.paymentGateway.verifyVnpayCallbackPayload(payload);
    const payment = await this.paymentRepository.findByProviderTransactionId(
      verified.providerTransactionId,
    );

    if (!payment) {
      throw new PaymentNotFoundError(verified.providerTransactionId);
    }

    return { ...verified, orderId: payment.orderId };
  }
}
