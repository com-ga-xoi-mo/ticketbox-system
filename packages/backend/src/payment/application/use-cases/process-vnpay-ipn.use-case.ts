import type { Prisma } from '@prisma/client';

import {
  OrderStatus,
  type TransitionOrderStatusUseCase,
} from '../../../ordering/order.module';
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
import { SuccessfulPaymentRecoverySource } from '../../domain/payment-recovery';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';

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
    private readonly finalizeSuccessfulPaymentUseCase: FinalizeSuccessfulPaymentUseCase,
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

      const recovery =
        currentPayment.status === PaymentStatus.SUCCEEDED
          ? await this.finalizeSuccessfulPaymentUseCase.execute({
              paymentId: currentPayment.id,
              source: SuccessfulPaymentRecoverySource.CALLBACK,
              occurredAt,
            })
          : null;

      return {
        payment: currentPayment,
        vnpay,
        duplicate: true,
        orderTransitioned: recovery?.orderTransitioned ?? false,
      };
    }

    const status = vnpay.success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    const updatedPayment = await this.paymentRepository.updateStatus({
      paymentId: payment.id,
      status,
      completedAt: occurredAt,
      failureCode: vnpay.failureCode,
      failureMessage: vnpay.failureMessage,
    });

    if (vnpay.success) {
      const recovery = await this.finalizeSuccessfulPaymentUseCase.execute({
        paymentId: updatedPayment.id,
        source: SuccessfulPaymentRecoverySource.CALLBACK,
        occurredAt,
      });
      return {
        payment: updatedPayment,
        vnpay,
        duplicate: false,
        orderTransitioned: recovery.orderTransitioned,
      };
    }

    return {
      payment: updatedPayment,
      vnpay,
      duplicate: false,
      orderTransitioned: await this.transitionFailedOrder(
        payment.orderId,
        occurredAt,
      ),
    };
  }

  private async transitionFailedOrder(
    orderId: string,
    occurredAt: Date,
  ): Promise<boolean> {
    try {
      await this.transitionOrderStatusUseCase.execute({
        orderId,
        status: OrderStatus.FAILED,
        skipOwnershipCheck: true,
        occurredAt,
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof OrderConflictError) return false;
      throw error;
    }
  }

  private toJsonValue(payload: VerifiedVnpayCallbackPayload): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }
}
