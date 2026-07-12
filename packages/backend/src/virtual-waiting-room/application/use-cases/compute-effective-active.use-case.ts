import { Inject, Injectable } from '@nestjs/common';

import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';
import type {
  EffectiveWaitingRoomState,
  WaitingRoomConfigRecord,
} from '../../domain/waiting-room.types';

@Injectable()
export class ComputeEffectiveActiveUseCase {
  constructor(
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
  ) {}

  async execute(
    config: WaitingRoomConfigRecord | null,
  ): Promise<EffectiveWaitingRoomState> {
    if (!config) {
      return { active: false, reason: 'NO_CONFIG' };
    }
    if (!config.enabled) {
      return { active: false, reason: 'DISABLED' };
    }
    if (config.manualOverride === 'FORCE_OFF') {
      return { active: false, reason: 'FORCE_OFF' };
    }
    if (config.manualOverride === 'FORCE_ON') {
      return { active: true, reason: 'FORCE_ON' };
    }
    if (!config.autoActivate) {
      return { active: false, reason: 'AUTO_INACTIVE' };
    }

    const load = await this.store.readLoadState(config.concertId);
    if (load.state === 'ACTIVE') {
      return { active: true, reason: 'AUTO_ACTIVE' };
    }
    return { active: false, reason: 'AUTO_INACTIVE' };
  }
}
