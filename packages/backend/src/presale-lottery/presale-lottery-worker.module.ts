import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../platform/queue/queue.module';
import { PRESALE_LOTTERY_QUEUE } from './infrastructure/queue/presale-lottery-queue.constants';
import { PresaleLotteryProcessor } from './infrastructure/queue/presale-lottery.processor';
import { PresaleLotteryModule } from './presale-lottery.module';

@Module({
  imports: [
    PresaleLotteryModule,
    QueueModule,
    BullModule.registerQueue({ name: PRESALE_LOTTERY_QUEUE }),
  ],
  providers: [PresaleLotteryProcessor],
})
export class PresaleLotteryWorkerModule {}
