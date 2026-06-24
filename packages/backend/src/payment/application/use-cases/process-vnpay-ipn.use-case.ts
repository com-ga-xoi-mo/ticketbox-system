import type { Prisma } from '@prisma/client';

import { OrderStatus } from '../../../ordering/order.module';
import type { TransitionOrderStatusUseCase } from '../../../ordering/order.module';
import { OrderConflictError } from '../../../ordering/domain/errors';
import {
  PaymentCallbackMismatchError,
  PaymentNotFoundError,
  VnpayAmountMismatchError,
} from '../../domain/errors';
import type { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  PaymentGatewayPort,
  VerifiedVnpayCallbackPayload,
  VnpayCallbackPayload,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';

export interface ProcessVnpayIpnResult {
  payment: Payment;
  vnpay: VerifiedVnpayCallbackPayload;
  duplicate: boolean;
  orderTransitioned: boolean;
}

export class ProcessVnpayIpnUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
  ) {}

  async execute(
    payload: VnpayCallbackPayload,
    occurredAt = new Date(),
  ): Promise<ProcessVnpayIpnResult> {
    const vnpay = this.paymentGateway.verifyVnpayCallbackPayload(payload);
    const payment = await this.paymentRepository.findByProviderTransactionId(
      vnpay.providerTransactionId,
    );

    if (!payment) {
      throw new PaymentNotFoundError(vnpay.providerTransactionId);
    }
    if (payment.provider !== PaymentProvider.VNPAY) {
      throw new PaymentCallbackMismatchError(payment.id);
    }
    if (!Number.isFinite(vnpay.amountVnd) || payment.amountVnd !== vnpay.amountVnd) {
      throw new VnpayAmountMismatchError(payment.amountVnd, vnpay.amountVnd);
    }

    const eventResult = await this.paymentRepository.recordEvent({
      paymentId: payment.id,
      eventType: PaymentEventType.CALLBACK_RECEIVED,
      providerEventId: vnpay.providerEventId,
      providerTransactionId: vnpay.providerPaymentId ?? vnpay.providerTransactionId,
      payload: this.toJsonValue(vnpay),
    });

    if (eventResult.duplicate || payment.status !== PaymentStatus.PENDING) {
      const currentPayment = await this.paymentRepository.findById(payment.id);
      if (!currentPayment) {
        throw new PaymentNotFoundError(payment.id);
      }

      return {
        payment: currentPayment,
        vnpay,
        duplicate: true,
        orderTransitioned: false,
      };
    }

    const status = vnpay.success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    const orderStatus = vnpay.success ? OrderStatus.PAID : OrderStatus.FAILED;
    const updatedPayment = await this.paymentRepository.updateStatus({
      paymentId: payment.id,
      status,
      completedAt: occurredAt,
      failureCode: vnpay.failureCode,
      failureMessage: vnpay.failureMessage,
    });

    return {
      payment: updatedPayment,
      vnpay,
      duplicate: false,
      orderTransitioned: await this.transitionOrderStatus(payment.orderId, orderStatus, occurredAt),
    };
  }

  private async transitionOrderStatus(
    orderId: string,
    status: OrderStatus,
    occurredAt: Date,
  ): Promise<boolean> {
    try {
      await this.transitionOrderStatusUseCase.execute({
        orderId,
        status,
        skipOwnershipCheck: true,
        occurredAt,
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof OrderConflictError) {
        return false;
      }
      throw err;
    }
  }

  private toJsonValue(payload: VerifiedVnpayCallbackPayload): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }
}
