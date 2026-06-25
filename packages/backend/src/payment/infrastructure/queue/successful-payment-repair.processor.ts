import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { RepairSuccessfulPaymentsUseCase } from '../../application/use-cases/repair-successful-payments.use-case';
import {
  PAYMENT_RECOVERY_QUEUE,
  REPAIR_SUCCESSFUL_PAYMENTS_JOB,
} from './payment-recovery-queue.constants';

@Injectable()
@Processor(PAYMENT_RECOVERY_QUEUE)
export class SuccessfulPaymentRepairProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(SuccessfulPaymentRepairProcessor.name);

  constructor(
    private readonly repairSuccessfulPaymentsUseCase: RepairSuccessfulPaymentsUseCase,
    private readonly config: PlatformConfigService,
    @InjectQueue(PAYMENT_RECOVERY_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.paymentRepairEnabled) return;

    await this.queue.add(
      REPAIR_SUCCESSFUL_PAYMENTS_JOB,
      {},
      {
        jobId: REPAIR_SUCCESSFUL_PAYMENTS_JOB,
        repeat: { every: this.config.paymentRepairIntervalMs },
        attempts: this.config.paymentRepairMaxAttempts,
        backoff: {
          type: 'exponential',
          delay: this.config.paymentRepairBackoffMs,
        },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<unknown> {
    const result = await this.repairSuccessfulPaymentsUseCase.execute({
      limit: this.config.paymentRepairBatchSize,
    });
    this.logger.log(
      `Successful payment repair ${job.id}: scanned=${result.scanned}, completed=${result.completed}, alreadyComplete=${result.alreadyComplete}, retryable=${result.retryable}, terminal=${result.terminal}`,
    );
    for (const paymentId of result.terminalPaymentIds) {
      this.logger.error(
        `Terminal paid-order recovery inconsistency: paymentId=${paymentId}`,
      );
    }
    for (const paymentId of result.retryablePaymentIds) {
      this.logger.warn(
        `Retryable paid-order recovery failure: paymentId=${paymentId}`,
      );
    }
    if (result.retryable > 0) {
      throw new Error(
        `Successful payment repair has ${result.retryable} retryable failures`,
      );
    }
    return result;
  }
}
