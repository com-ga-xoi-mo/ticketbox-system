import {
  OrderStatus,
  type TransitionOrderStatusUseCase,
} from '../../../ordering/order.module';
import { OrderConflictError } from '../../../ordering/domain/errors';

import {
  PaymentCallbackMismatchError,
  PaymentNotFoundError,
  UnsupportedPaymentSimulatorOutcomeError,
} from '../../domain/errors';
import type { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentSimulatorOutcome } from '../../domain/payment-simulator-outcome.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';
import { SuccessfulPaymentRecoverySource } from '../../domain/payment-recovery';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';

export interface ProcessSimulatorPaymentCallbackCommand {
  token: string;
  outcome: string;
  providerEventId?: string;
  occurredAt?: Date;
}

export interface ProcessSimulatorPaymentCallbackResult {
  payment: Payment;
  outcome: PaymentSimulatorOutcome;
  duplicate: boolean;
  orderTransitioned: boolean;
}

export class ProcessSimulatorPaymentCallbackUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly finalizeSuccessfulPaymentUseCase: FinalizeSuccessfulPaymentUseCase,
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
  ) {}

  async execute(
    command: ProcessSimulatorPaymentCallbackCommand,
  ): Promise<ProcessSimulatorPaymentCallbackResult> {
    const outcome = this.parseOutcome(command.outcome);
    const tokenPayload = this.paymentGateway.verifySimulatorToken(command.token);
    const payment = await this.paymentRepository.findById(tokenPayload.paymentId);

    if (!payment) {
      throw new PaymentNotFoundError(tokenPayload.paymentId);
    }
    if (
      payment.orderId !== tokenPayload.orderId ||
      payment.userId !== tokenPayload.userId ||
      payment.providerTransactionId !== tokenPayload.providerTransactionId
    ) {
      throw new PaymentCallbackMismatchError(payment.id);
    }

    if (outcome === PaymentSimulatorOutcome.TIMEOUT) {
      return { payment, outcome, duplicate: false, orderTransitioned: false };
    }
    if (
      outcome === PaymentSimulatorOutcome.DELAYED_SUCCESS ||
      outcome === PaymentSimulatorOutcome.DELAYED_FAILURE
    ) {
      return { payment, outcome, duplicate: false, orderTransitioned: false };
    }

    const normalizedOutcome =
      outcome === PaymentSimulatorOutcome.DUPLICATE_SUCCESS
        ? PaymentSimulatorOutcome.SUCCESS
        : outcome;
    const providerEventId =
      command.providerEventId ??
      this.providerEventId(tokenPayload.providerTransactionId, normalizedOutcome);

    const eventResult = await this.paymentRepository.recordEvent({
      paymentId: payment.id,
      eventType: PaymentEventType.CALLBACK_RECEIVED,
      providerEventId,
      providerTransactionId: tokenPayload.providerTransactionId,
      payload: {
        outcome: normalizedOutcome,
        providerTransactionId: tokenPayload.providerTransactionId,
      },
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
              occurredAt: command.occurredAt,
            })
          : null;
      return {
        payment: currentPayment,
        outcome,
        duplicate: true,
        orderTransitioned: recovery?.orderTransitioned ?? false,
      };
    }

    if (normalizedOutcome === PaymentSimulatorOutcome.SUCCESS) {
      const paidAt = command.occurredAt ?? new Date();
      const updatedPayment = await this.paymentRepository.updateStatus({
        paymentId: payment.id,
        status: PaymentStatus.SUCCEEDED,
        completedAt: paidAt,
      });

      const recovery = await this.finalizeSuccessfulPaymentUseCase.execute({
        paymentId: updatedPayment.id,
        source: SuccessfulPaymentRecoverySource.CALLBACK,
        occurredAt: paidAt,
      });

      return {
        payment: updatedPayment,
        outcome,
        duplicate: false,
        orderTransitioned: recovery.orderTransitioned,
      };
    }

    const failedAt = command.occurredAt ?? new Date();
    const updatedPayment = await this.paymentRepository.updateStatus({
      paymentId: payment.id,
      status: PaymentStatus.FAILED,
      completedAt: failedAt,
      failureCode: 'SIMULATED_FAILURE',
      failureMessage: 'Payment simulator returned failure',
    });

    const orderTransitioned = await this.transitionFailedOrder(
      payment.orderId,
      failedAt,
    );
    return {
      payment: updatedPayment,
      outcome,
      duplicate: false,
      orderTransitioned,
    };
  }

  private parseOutcome(outcome: string): PaymentSimulatorOutcome {
    if (Object.values(PaymentSimulatorOutcome).includes(outcome as PaymentSimulatorOutcome)) {
      return outcome as PaymentSimulatorOutcome;
    }
    throw new UnsupportedPaymentSimulatorOutcomeError(outcome);
  }

  private providerEventId(providerTransactionId: string, outcome: PaymentSimulatorOutcome): string {
    return `${providerTransactionId}:${outcome}`;
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

}
