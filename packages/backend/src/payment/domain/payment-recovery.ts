import type { OrderStatus } from '../../ordering/domain/order-status.enum';

export enum SuccessfulPaymentRecoverySource {
  CALLBACK = 'CALLBACK',
  REPAIR_WORKER = 'REPAIR_WORKER',
  ADMIN = 'ADMIN',
}

export enum SuccessfulPaymentFinalizationOutcome {
  COMPLETED = 'COMPLETED',
  ALREADY_COMPLETE = 'ALREADY_COMPLETE',
  RETRYABLE_FAILURE = 'RETRYABLE_FAILURE',
  TERMINAL_CONFLICT = 'TERMINAL_CONFLICT',
}

export interface SuccessfulPaymentRecoveryState {
  paymentId: string;
  orderId: string;
  paymentCompletedAt: Date | null;
  orderStatus: OrderStatus;
  expectedTicketCount: number;
  existingTicketCount: number;
}

export interface FinalizeSuccessfulPaymentCommand {
  paymentId: string;
  source: SuccessfulPaymentRecoverySource;
  occurredAt?: Date;
}

export interface FinalizeSuccessfulPaymentResult {
  paymentId: string;
  orderId: string;
  outcome: SuccessfulPaymentFinalizationOutcome;
  orderTransitioned: boolean;
  ticketsComplete: boolean;
  reason?: string;
}
