import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import type {
  ReleasedPrimarySaleItem,
  WaitlistReleasePublisherPort,
} from '../../../ordering/domain/ports/waitlist-release-publisher.port';
import {
  GRANT_WAITLIST_ENTITLEMENTS_JOB,
  OFFICIAL_WAITLIST_QUEUE,
} from './official-waitlist-queue.constants';

@Injectable()
export class WaitlistReleasePublisher implements WaitlistReleasePublisherPort {
  constructor(
    @InjectQueue(OFFICIAL_WAITLIST_QUEUE)
    private readonly queue: Queue,
  ) {}

  async publishPrimarySaleRelease(items: ReleasedPrimarySaleItem[]): Promise<void> {
    for (const item of items) {
      await this.queue.add(GRANT_WAITLIST_ENTITLEMENTS_JOB, item, {
        removeOnComplete: 50,
        removeOnFail: 100,
      });
    }
  }
}
