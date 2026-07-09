import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { AdmitWaitingRoomUseCase } from '../../application/use-cases/admit-waiting-room.use-case';
import {
  ADMIT_WAITING_ROOM_JOB,
  VIRTUAL_WAITING_ROOM_QUEUE,
} from './waiting-room-queue.constants';

@Injectable()
@Processor(VIRTUAL_WAITING_ROOM_QUEUE)
export class WaitingRoomAdmitProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(WaitingRoomAdmitProcessor.name);

  constructor(
    private readonly admitWaitingRoom: AdmitWaitingRoomUseCase,
    @InjectQueue(VIRTUAL_WAITING_ROOM_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      ADMIT_WAITING_ROOM_JOB,
      {},
      {
        jobId: ADMIT_WAITING_ROOM_JOB,
        repeat: { every: 5_000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  async process(job: Job): Promise<unknown> {
    const results = await this.admitWaitingRoom.executeRunnableRooms();
    const admitted = results.reduce((sum, result) => sum + result.admitted.length, 0);
    const expired = results.reduce(
      (sum, result) => sum + result.expiredUserIds.length,
      0,
    );
    this.logger.debug(
      `Waiting room admit job ${job.id} admitted=${admitted}, expired=${expired}`,
    );
    return { admitted, expired };
  }
}
