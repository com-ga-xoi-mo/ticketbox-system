import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { ExpireReservationsUseCase } from '../../application/use-cases/expire-reservations.use-case';
import {
  EXPIRE_RESERVATIONS_JOB,
  ORDER_EXPIRATION_QUEUE,
} from './order-expiration-queue.constants';

@Injectable()
@Processor(ORDER_EXPIRATION_QUEUE)
export class ExpiredReservationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ExpiredReservationProcessor.name);

  constructor(
    private readonly expireReservationsUseCase: ExpireReservationsUseCase,
    @InjectQueue(ORDER_EXPIRATION_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      EXPIRE_RESERVATIONS_JOB,
      {},
      {
        jobId: EXPIRE_RESERVATIONS_JOB,
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<{ scanned: number; expired: number; failed: number }> {
    const result = await this.expireReservationsUseCase.execute();
    this.logger.debug(
      `Expired reservation scan completed by job ${job.id}: scanned=${result.scanned}, expired=${result.expired}, failed=${result.failed}`,
    );
    return result;
  }
}
