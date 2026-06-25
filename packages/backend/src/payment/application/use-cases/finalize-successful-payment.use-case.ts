import {
  IssueTicketsForPaidOrderUseCase,
  OrderStatus,
  TransitionOrderStatusUseCase,
} from '../../../ordering/order.module';
import {
  InventoryReservationConflictError,
  OrderConflictError,
} from '../../../ordering/domain/errors';
import { PaymentStatus } from '../../domain/payment-status.enum';
import {
  type FinalizeSuccessfulPaymentCommand,
  type FinalizeSuccessfulPaymentResult,
  SuccessfulPaymentFinalizationOutcome,
} from '../../domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from '../../domain/ports/payment-recovery-repository.port';
import type { PaymentRepositoryPort } from '../../domain/ports/payment-repository.port';

export class FinalizeSuccessfulPaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly recoveryRepository: PaymentRecoveryRepositoryPort,
    private readonly transitionOrderStatusUseCase: TransitionOrderStatusUseCase,
    private readonly issueTicketsForPaidOrderUseCase: IssueTicketsForPaidOrderUseCase,
  ) {}

  async execute(
    command: FinalizeSuccessfulPaymentCommand,
  ): Promise<FinalizeSuccessfulPaymentResult> {
    const payment = await this.paymentRepository.findById(command.paymentId);
    if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
      return {
        paymentId: command.paymentId,
        orderId: payment?.orderId ?? 'unknown',
        outcome: SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
        orderTransitioned: false,
        ticketsComplete: false,
        reason: 'PAYMENT_NOT_SUCCEEDED',
      };
    }

    let state = await this.recoveryRepository.findState(payment.id);
    if (!state) {
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        outcome: SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
        orderTransitioned: false,
        ticketsComplete: false,
        reason: 'RECOVERY_STATE_UNAVAILABLE',
      };
    }

    if (
      [
        OrderStatus.EXPIRED,
        OrderStatus.FAILED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ].includes(state.orderStatus)
    ) {
      return this.result(
        state,
        SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
        false,
        'ORDER_TERMINAL',
      );
    }

    const initiallyIncomplete =
      state.orderStatus !== OrderStatus.PAID ||
      state.existingTicketCount !== state.expectedTicketCount;
    let orderTransitioned = false;
    if (state.orderStatus === OrderStatus.PENDING_PAYMENT) {
      try {
        await this.transitionOrderStatusUseCase.execute({
          orderId: state.orderId,
          status: OrderStatus.PAID,
          skipOwnershipCheck: true,
          occurredAt: command.occurredAt ?? state.paymentCompletedAt ?? new Date(),
        });
        orderTransitioned = true;
      } catch (error: unknown) {
        if (error instanceof InventoryReservationConflictError) {
          return this.result(
            state,
            SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT,
            false,
            error.name,
          );
        }
        if (!(error instanceof OrderConflictError)) {
          state = (await this.recoveryRepository.findState(payment.id)) ?? state;
          if (state.orderStatus !== OrderStatus.PAID) {
            return this.result(
              state,
              SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
              false,
              error instanceof Error ? error.name : 'FINALIZATION_FAILED',
            );
          }
        }
      }
    }

    state = (await this.recoveryRepository.findState(payment.id)) ?? state;
    if (state.orderStatus !== OrderStatus.PAID) {
      return this.result(
        state,
        SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
        orderTransitioned,
        'ORDER_NOT_PAID_AFTER_TRANSITION',
      );
    }

    try {
      await this.issueTicketsForPaidOrderUseCase.execute({
        orderId: state.orderId,
        issuedAt: state.paymentCompletedAt ?? command.occurredAt ?? new Date(),
      });
    } catch (error: unknown) {
      return this.result(
        state,
        SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
        orderTransitioned,
        error instanceof Error ? error.name : 'TICKET_ISSUANCE_FAILED',
      );
    }

    const completedState =
      (await this.recoveryRepository.findState(payment.id)) ?? state;
    const ticketsComplete =
      completedState.existingTicketCount === completedState.expectedTicketCount;
    if (!ticketsComplete) {
      return this.result(
        completedState,
        SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE,
        orderTransitioned,
        'TICKETS_INCOMPLETE',
      );
    }

    return this.result(
      completedState,
      orderTransitioned || initiallyIncomplete
        ? SuccessfulPaymentFinalizationOutcome.COMPLETED
        : SuccessfulPaymentFinalizationOutcome.ALREADY_COMPLETE,
      orderTransitioned,
    );
  }

  private result(
    state: {
      paymentId: string;
      orderId: string;
      expectedTicketCount: number;
      existingTicketCount: number;
    },
    outcome: SuccessfulPaymentFinalizationOutcome,
    orderTransitioned: boolean,
    reason?: string,
  ): FinalizeSuccessfulPaymentResult {
    return {
      paymentId: state.paymentId,
      orderId: state.orderId,
      outcome,
      orderTransitioned,
      ticketsComplete:
        state.expectedTicketCount === state.existingTicketCount,
      reason,
    };
  }
}
