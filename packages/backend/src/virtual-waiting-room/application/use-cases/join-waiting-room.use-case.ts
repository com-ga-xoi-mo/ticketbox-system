import { Inject, Injectable } from '@nestjs/common';

import { GetWaitingRoomStatusUseCase } from './get-waiting-room-status.use-case';
import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';
import type { WaitingRoomQueueStatus } from '../../domain/waiting-room.types';

@Injectable()
export class JoinWaitingRoomUseCase {
  constructor(
    private readonly getStatus: GetWaitingRoomStatusUseCase,
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
  ) {}

  async execute(input: {
    concertId: string;
    userId: string;
    now?: Date;
  }): Promise<WaitingRoomQueueStatus> {
    const status = await this.getStatus.execute(input);
    if (!status.active || status.status === 'ADMITTED') {
      return status;
    }
    return this.store.joinQueue({
      concertId: input.concertId,
      userId: input.userId,
      joinedAt: input.now ?? new Date(),
    });
  }
}
