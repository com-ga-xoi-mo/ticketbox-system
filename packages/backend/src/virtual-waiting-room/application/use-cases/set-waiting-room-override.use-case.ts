import { Inject, Injectable } from '@nestjs/common';

import { WaitingRoomConcertNotFoundError } from '../../domain/errors';
import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import type {
  WaitingRoomConfigRecord,
  WaitingRoomManualOverride,
} from '../../domain/waiting-room.types';

@Injectable()
export class SetWaitingRoomOverrideUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly repository: WaitingRoomConfigRepositoryPort,
  ) {}

  async execute(input: {
    concertId: string;
    manualOverride: WaitingRoomManualOverride;
  }): Promise<WaitingRoomConfigRecord> {
    const config = await this.repository.setManualOverride(input);
    if (!config) {
      throw new WaitingRoomConcertNotFoundError(input.concertId);
    }
    return config;
  }
}
