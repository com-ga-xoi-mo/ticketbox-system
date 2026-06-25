import {
  SuccessfulPaymentFinalizationOutcome,
  SuccessfulPaymentRecoverySource,
} from '../../domain/payment-recovery';
import type { PaymentRecoveryRepositoryPort } from '../../domain/ports/payment-recovery-repository.port';
import type { FinalizeSuccessfulPaymentUseCase } from './finalize-successful-payment.use-case';

export interface RepairSuccessfulPaymentsCommand {
  limit?: number;
}

export interface RepairSuccessfulPaymentsResult {
  scanned: number;
  completed: number;
  alreadyComplete: number;
  retryable: number;
  terminal: number;
  retryablePaymentIds: string[];
  terminalPaymentIds: string[];
}

export class RepairSuccessfulPaymentsUseCase {
  constructor(
    private readonly recoveryRepository: PaymentRecoveryRepositoryPort,
    private readonly finalizeSuccessfulPaymentUseCase: FinalizeSuccessfulPaymentUseCase,
  ) {}

  async execute(
    command: RepairSuccessfulPaymentsCommand = {},
  ): Promise<RepairSuccessfulPaymentsResult> {
    const paymentIds = await this.recoveryRepository.findCandidatePaymentIds(
      command.limit ?? 50,
    );
    const result: RepairSuccessfulPaymentsResult = {
      scanned: paymentIds.length,
      completed: 0,
      alreadyComplete: 0,
      retryable: 0,
      terminal: 0,
      retryablePaymentIds: [],
      terminalPaymentIds: [],
    };

    for (const paymentId of paymentIds) {
      const finalization = await this.finalizeSuccessfulPaymentUseCase.execute({
        paymentId,
        source: SuccessfulPaymentRecoverySource.REPAIR_WORKER,
      });
      switch (finalization.outcome) {
        case SuccessfulPaymentFinalizationOutcome.COMPLETED:
          result.completed += 1;
          break;
        case SuccessfulPaymentFinalizationOutcome.ALREADY_COMPLETE:
          result.alreadyComplete += 1;
          break;
        case SuccessfulPaymentFinalizationOutcome.RETRYABLE_FAILURE:
          result.retryable += 1;
          result.retryablePaymentIds.push(paymentId);
          break;
        case SuccessfulPaymentFinalizationOutcome.TERMINAL_CONFLICT:
          result.terminal += 1;
          result.terminalPaymentIds.push(paymentId);
          break;
      }
    }

    return result;
  }
}
