import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { WatchWaitlistAvailabilityUseCase } from '../../application/use-cases/waitlist.use-cases';
import {
  OFFICIAL_WAITLIST_QUEUE,
  WATCH_WAITLIST_AVAILABILITY_JOB,
} from './official-waitlist-queue.constants';

@Injectable()
@Processor(OFFICIAL_WAITLIST_QUEUE)
export class OfficialWaitlistProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OfficialWaitlistProcessor.name);

  constructor(
    private readonly watchWaitlistAvailability: WatchWaitlistAvailabilityUseCase,
    @InjectQueue(OFFICIAL_WAITLIST_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      WATCH_WAITLIST_AVAILABILITY_JOB,
      {},
      {
        jobId: WATCH_WAITLIST_AVAILABILITY_JOB,
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<unknown> {
    const result = await this.watchWaitlistAvailability.execute();
    this.logger.debug(
      `Waitlist availability job ${job.id} scanned=${result.scanned}, ticketTypes=${result.notifiedTicketTypes}, notifications=${result.notifications}`,
    );
    return result;
  }
}
