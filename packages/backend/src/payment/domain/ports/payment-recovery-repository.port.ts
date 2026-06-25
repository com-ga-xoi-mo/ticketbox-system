import type { SuccessfulPaymentRecoveryState } from '../payment-recovery';

export const PAYMENT_RECOVERY_REPOSITORY = Symbol('PAYMENT_RECOVERY_REPOSITORY');

export interface PaymentRecoveryRepositoryPort {
  findState(paymentId: string): Promise<SuccessfulPaymentRecoveryState | null>;
  findCandidatePaymentIds(limit: number): Promise<string[]>;
}
