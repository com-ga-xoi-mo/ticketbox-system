import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import {
  ExpireWaitlistEntitlementsUseCase,
  GrantWaitlistEntitlementsUseCase,
  SendWaitlistEntitlementRemindersUseCase,
} from '../../application/use-cases/waitlist.use-cases';
import {
  EXPIRE_WAITLIST_ENTITLEMENTS_JOB,
  GRANT_WAITLIST_ENTITLEMENTS_JOB,
  OFFICIAL_WAITLIST_QUEUE,
} from './official-waitlist-queue.constants';

@Injectable()
@Processor(OFFICIAL_WAITLIST_QUEUE)
export class OfficialWaitlistProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OfficialWaitlistProcessor.name);

  constructor(
    private readonly grantWaitlistEntitlements: GrantWaitlistEntitlementsUseCase,
    private readonly expireWaitlistEntitlements: ExpireWaitlistEntitlementsUseCase,
    private readonly sendWaitlistEntitlementReminders: SendWaitlistEntitlementRemindersUseCase,
    @InjectQueue(OFFICIAL_WAITLIST_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      EXPIRE_WAITLIST_ENTITLEMENTS_JOB,
      {},
      {
        jobId: EXPIRE_WAITLIST_ENTITLEMENTS_JOB,
        repeat: { every: 60_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === GRANT_WAITLIST_ENTITLEMENTS_JOB) {
      const result = await this.grantWaitlistEntitlements.execute({
        ticketTypeId: job.data.ticketTypeId,
        releasedQuantity: job.data.quantityReleased,
      });
      this.logger.debug(
        `Waitlist grant job ${job.id} granted ${result.length} entitlements`,
      );
      return { granted: result.length };
    }

    const result = await this.expireWaitlistEntitlements.execute();
    const reminders = await this.sendWaitlistEntitlementReminders.execute();
    this.logger.debug(
      `Waitlist expiry job ${job.id} expired=${result.expired}, grantsTriggered=${result.grantsTriggered}, remindersEnqueued=${reminders.enqueued}`,
    );
    return { ...result, remindersEnqueued: reminders.enqueued };
  }
}
