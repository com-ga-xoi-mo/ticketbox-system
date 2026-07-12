import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  WaitingRoomAdmissionInvalidError,
  WaitingRoomAdmissionRequiredError,
} from '../../domain/errors';
import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import {
  WAITING_ROOM_STORE,
  type WaitingRoomStorePort,
} from '../../domain/ports/waiting-room-store.port';
import { ComputeEffectiveActiveUseCase } from './compute-effective-active.use-case';

@Injectable()
export class ValidateAdmissionUseCase {
  private readonly logger = new Logger(ValidateAdmissionUseCase.name);

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
    token?: string;
    failOpen: boolean;
    now?: Date;
  }): Promise<void> {
    let active = false;
    try {
      const config = await this.configs.findByConcertId(input.concertId);
      active = (await this.computeActive.execute(config)).active;
    } catch (err) {
      if (input.failOpen) {
        this.logger.warn(
          `Waiting room fail-open for concert ${input.concertId}: ${String(err)}`,
        );
        return;
      }
      throw err;
    }

    if (!active) {
      return;
    }
    if (!input.token) {
      throw new WaitingRoomAdmissionRequiredError(input.concertId);
    }

    const record = await this.store.validateAdmission({
      concertId: input.concertId,
      userId: input.userId,
      token: input.token,
      now: input.now ?? new Date(),
    });
    if (!record) {
      throw new WaitingRoomAdmissionInvalidError(input.token);
    }
  }
}
