import { Inject, Injectable } from '@nestjs/common';

import { ComputeEffectiveActiveUseCase } from './compute-effective-active.use-case';
import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';
import type { WaitingRoomQueueStatus } from '../../domain/waiting-room.types';

@Injectable()
export class GetWaitingRoomStatusUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly configs: WaitingRoomConfigRepositoryPort,
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
    private readonly computeActive: ComputeEffectiveActiveUseCase,
  ) {}

  async execute(input: {
    concertId: string;
    userId: string;
  }): Promise<WaitingRoomQueueStatus> {
    const config = await this.configs.findByConcertId(input.concertId);
    const effective = await this.computeActive.execute(config);
    if (!effective.active) {
      return {
        concertId: input.concertId,
        userId: input.userId,
        active: false,
        status: 'INACTIVE',
        position: null,
        admissionToken: null,
        admissionExpiresAt: null,
      };
    }
    return this.store.getQueueStatus(input);
  }
}
