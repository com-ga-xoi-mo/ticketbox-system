import { Inject, Injectable } from '@nestjs/common';

import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';

@Injectable()
export class IncrementWaitingRoomLoadUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly configs: WaitingRoomConfigRepositoryPort,
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
  ) {}

  async execute(concertId: string, now = new Date()): Promise<void> {
    const config = await this.configs.findByConcertId(concertId);
    if (!config?.enabled || !config.autoActivate) {
      return;
    }
    await this.store.incrementLoad(concertId);
    await this.store.updateLoadState({
      concertId,
      activateThreshold: config.activateThreshold,
      deactivateThreshold: config.deactivateThreshold,
      cooldownSeconds: config.cooldownSeconds,
      now,
    });
  }
}
