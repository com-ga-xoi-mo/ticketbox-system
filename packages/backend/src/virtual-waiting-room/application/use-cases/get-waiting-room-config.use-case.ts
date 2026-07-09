import { Inject, Injectable } from '@nestjs/common';

import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import type { WaitingRoomConfigRecord } from '../../domain/waiting-room.types';

@Injectable()
export class GetWaitingRoomConfigUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly repository: WaitingRoomConfigRepositoryPort,
  ) {}

  execute(concertId: string): Promise<WaitingRoomConfigRecord | null> {
    return this.repository.findByConcertId(concertId);
  }
}

