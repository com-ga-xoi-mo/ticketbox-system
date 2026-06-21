import { randomUUID } from 'crypto';

import { OrderStatus } from '../../../ordering/order.module';
import type { GetOrderUseCase } from '../../../ordering/order.module';
import type { Payment } from '../../domain/payment.entity';
import { PaymentOrderNotPendingError } from '../../domain/errors';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  PaymentGatewayPort,
  PaymentProviderMetadata,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';

export interface InitiatePaymentCommand {
  orderId: string;
  userId: string;
  provider?: PaymentProvider;
}

export interface InitiatePaymentResult {
  payment: Payment;
  redirectUrl: string;
  simulatorToken?: string;
  providerMetadata?: PaymentProviderMetadata;
}

export class InitiatePaymentUseCase {
  constructor(
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<InitiatePaymentResult> {
    const order = await this.getOrderUseCase.execute({
      orderId: command.orderId,
      userId: command.userId,
    });

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new PaymentOrderNotPendingError(order.id, order.status);
    }

    const createdAt = new Date();
    const paymentId = randomUUID();
    const provider = command.provider ?? PaymentProvider.SIMULATOR;
    const session = await this.paymentGateway.createRedirectSession({
      provider,
      paymentId,
      orderId: order.id,
      userId: order.userId,
      amountVnd: order.totalAmountVnd,
    });

    const payment = await this.paymentRepository.create({
      id: paymentId,
      orderId: order.id,
      userId: order.userId,
      provider: session.provider,
      providerTransactionId: session.providerTransactionId,
      status: PaymentStatus.PENDING,
      amountVnd: order.totalAmountVnd,
      redirectUrl: session.redirectUrl,
      createdAt,
    });

    return {
      payment,
      redirectUrl: session.redirectUrl,
      simulatorToken: session.simulatorToken,
      providerMetadata: session.providerMetadata,
    };
  }
}
