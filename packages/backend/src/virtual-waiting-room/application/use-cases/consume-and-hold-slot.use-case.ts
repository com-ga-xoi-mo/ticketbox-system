import { Inject, Injectable } from '@nestjs/common';

import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';

@Injectable()
export class ConsumeAndHoldSlotUseCase {
  constructor(
    @Inject(WAITING_ROOM_STORE)
    private readonly store: WaitingRoomStorePort,
  ) {}

  async execute(input: {
    concertId: string;
    userId: string;
    holdTtlMinutes: number;
  }): Promise<void> {
    await this.store.consumeAndHoldSlot(input);
  }
}
