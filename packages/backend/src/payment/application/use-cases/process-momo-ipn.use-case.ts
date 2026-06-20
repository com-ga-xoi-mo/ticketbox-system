import type { Prisma } from '@prisma/client';

import { OrderStatus } from '../../../ordering/order.module';
import type { TransitionOrderStatusUseCase } from '../../../ordering/order.module';
import { OrderConflictError } from '../../../ordering/domain/errors';
import { PaymentCallbackMismatchError, PaymentNotFoundError } from '../../domain/errors';
import type { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentProvider } from '../../domain/payment-provider.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  MomoIpnPayload,
  PaymentGatewayPort,
  VerifiedMomoIpnPayload,
} from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';

export interface ProcessMomoIpnCommand {
  payload: MomoIpnPayload;
  occurredAt?: Date;
}

export interface ProcessMomoIpnResult {
  payment: Payment;
  momo: VerifiedMomoIpnPayload;
  duplicate: boolean;
  orderTransitioned: boolean;
}

export class ProcessMomoIpnUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
  ) {}

  async execute(command: ProcessMomoIpnCommand): Promise<ProcessMomoIpnResult> {
    const momo = this.paymentGateway.verifyMomoIpnPayload(command.payload);
    const payment = await this.paymentRepository.findByProviderTransactionId(
      momo.providerTransactionId,
    );

    if (!payment) {
      throw new PaymentNotFoundError(momo.providerTransactionId);
    }
    if (payment.provider !== PaymentProvider.MOMO) {
      throw new PaymentCallbackMismatchError(payment.id);
    }

    const eventResult = await this.paymentRepository.recordEvent({
      paymentId: payment.id,
      eventType: PaymentEventType.CALLBACK_RECEIVED,
      providerEventId: momo.providerEventId,
      providerTransactionId: momo.providerTransactionId,
      payload: this.toJsonValue(momo),
    });

    if (eventResult.duplicate || payment.status !== PaymentStatus.PENDING) {
      const currentPayment = await this.paymentRepository.findById(payment.id);
      if (!currentPayment) {
        throw new PaymentNotFoundError(payment.id);
      }

      return {
        payment: currentPayment,
        momo,
        duplicate: true,
        orderTransitioned: false,
      };
    }

    const occurredAt = command.occurredAt ?? new Date();
    if (momo.success) {
      const updatedPayment = await this.paymentRepository.updateStatus({
        paymentId: payment.id,
        status: PaymentStatus.SUCCEEDED,
        completedAt: occurredAt,
      });

      return {
        payment: updatedPayment,
        momo,
        duplicate: false,
        orderTransitioned: await this.transitionOrderStatus({
          orderId: payment.orderId,
          status: OrderStatus.PAID,
          occurredAt,
        }),
      };
    }

    const updatedPayment = await this.paymentRepository.updateStatus({
      paymentId: payment.id,
      status: PaymentStatus.FAILED,
      completedAt: occurredAt,
      failureCode: momo.failureCode,
      failureMessage: momo.failureMessage,
    });

    return {
      payment: updatedPayment,
      momo,
      duplicate: false,
      orderTransitioned: await this.transitionOrderStatus({
        orderId: payment.orderId,
        status: OrderStatus.FAILED,
        occurredAt,
      }),
    };
  }

  private async transitionOrderStatus(params: {
    orderId: string;
    status: OrderStatus;
    occurredAt: Date;
  }): Promise<boolean> {
    try {
      await this.transitionOrderStatusUseCase.execute({
        orderId: params.orderId,
        status: params.status,
        skipOwnershipCheck: true,
        occurredAt: params.occurredAt,
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof OrderConflictError) {
        return false;
      }
      throw err;
    }
  }

  private toJsonValue(payload: VerifiedMomoIpnPayload): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }
}
