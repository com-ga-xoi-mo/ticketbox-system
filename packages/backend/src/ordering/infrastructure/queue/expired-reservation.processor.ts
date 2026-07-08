import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { ExpireReservationsUseCase } from '../../application/use-cases/expire-reservations.use-case';
import type { WaitlistReleasePublisherPort } from '../../domain/ports/waitlist-release-publisher.port';
import { WAITLIST_RELEASE_PUBLISHER } from '../../domain/ports/waitlist-release-publisher.port';
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
    @Inject(WAITLIST_RELEASE_PUBLISHER)
    private readonly waitlistReleasePublisher: WaitlistReleasePublisherPort,
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

  async process(job: Job): Promise<{
    scanned: number;
    expired: number;
    skippedPaid: number;
    conflicted: number;
    failed: number;
    releasedItems: Array<{ ticketTypeId: string; quantityReleased: number }>;
  }> {
    const result = await this.expireReservationsUseCase.execute();
    if (result.releasedItems.length > 0) {
      await this.waitlistReleasePublisher.publishPrimarySaleRelease(
        result.releasedItems,
      );
    }
    this.logger.debug(
      `Expired reservation scan completed by job ${job.id}: scanned=${result.scanned}, expired=${result.expired}, skippedPaid=${result.skippedPaid}, conflicted=${result.conflicted}, failed=${result.failed}, releasedTicketTypes=${result.releasedItems.length}`,
    );
    return result;
  }
}
