import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../platform/queue/queue.module';
import { OFFICIAL_WAITLIST_QUEUE } from './infrastructure/queue/official-waitlist-queue.constants';
import { OfficialWaitlistProcessor } from './infrastructure/queue/official-waitlist.processor';
import { OfficialWaitlistModule } from './official-waitlist.module';

@Module({
  imports: [
    OfficialWaitlistModule,
    QueueModule,
    BullModule.registerQueue({ name: OFFICIAL_WAITLIST_QUEUE }),
  ],
  providers: [OfficialWaitlistProcessor],
})
export class OfficialWaitlistWorkerModule {}
