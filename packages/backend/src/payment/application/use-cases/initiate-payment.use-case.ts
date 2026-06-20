import { randomUUID } from 'crypto';

import { GetOrderUseCase, OrderStatus } from '../../../ordering/order.module';
import { Payment } from '../../domain/payment.entity';
import { PaymentOrderNotPendingError } from '../../domain/errors';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';

export interface InitiatePaymentCommand {
  orderId: string;
  userId: string;
}

export interface InitiatePaymentResult {
  payment: Payment;
  redirectUrl: string;
  simulatorToken: string;
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
    const session = this.paymentGateway.createRedirectSession({
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
    };
  }
}
