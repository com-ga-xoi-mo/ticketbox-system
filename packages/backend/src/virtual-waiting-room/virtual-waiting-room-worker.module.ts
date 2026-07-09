import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../platform/queue/queue.module';
import { WaitingRoomAdmitProcessor } from './infrastructure/queue/waiting-room-admit.processor';
import { VIRTUAL_WAITING_ROOM_QUEUE } from './infrastructure/queue/waiting-room-queue.constants';
import { VirtualWaitingRoomModule } from './virtual-waiting-room.module';

@Module({
  imports: [
    VirtualWaitingRoomModule,
    QueueModule,
    BullModule.registerQueue({ name: VIRTUAL_WAITING_ROOM_QUEUE }),
  ],
  providers: [WaitingRoomAdmitProcessor],
})
export class VirtualWaitingRoomWorkerModule {}

