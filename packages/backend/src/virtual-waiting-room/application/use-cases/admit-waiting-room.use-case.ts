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
import type { AdmitWaitingRoomResult } from '../../domain/waiting-room.types';

@Injectable()
export class AdmitWaitingRoomUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly configs: WaitingRoomConfigRepositoryPort,
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
    private readonly computeActive: ComputeEffectiveActiveUseCase,
  ) {}

  async execute(concertId: string, now = new Date()): Promise<AdmitWaitingRoomResult> {
    const config = await this.configs.findByConcertId(concertId);
    const effective = await this.computeActive.execute(config);
    if (!config || !effective.active) {
      return { admitted: [], expiredUserIds: [] };
    }
    return this.store.withConcertLock(concertId, () =>
      this.store.admitBatch({
        concertId,
        maxConcurrency: config.maxConcurrency,
        admissionTtlSeconds: config.admissionTtlSeconds,
        now,
      }),
    );
  }

  async executeRunnableRooms(now = new Date()): Promise<AdmitWaitingRoomResult[]> {
    const configs = await this.configs.listRunnableRooms();
    const results: AdmitWaitingRoomResult[] = [];
    for (const config of configs) {
      results.push(await this.execute(config.concertId, now));
    }
    return results;
  }
}
