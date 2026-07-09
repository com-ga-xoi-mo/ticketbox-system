import { Inject, Injectable } from '@nestjs/common';

import { WaitingRoomInvalidConfigError } from '../../domain/errors';
import {
  WAITING_ROOM_CONFIG_REPOSITORY,
  type WaitingRoomConfigRepositoryPort,
} from '../../domain/ports/waiting-room-config-repository.port';
import type {
  WaitingRoomConfigInput,
  WaitingRoomConfigRecord,
} from '../../domain/waiting-room.types';

@Injectable()
export class ConfigureWaitingRoomUseCase {
  constructor(
    @Inject(WAITING_ROOM_CONFIG_REPOSITORY)
    private readonly repository: WaitingRoomConfigRepositoryPort,
  ) {}

  async execute(input: WaitingRoomConfigInput): Promise<WaitingRoomConfigRecord> {
    this.validate(input);
    return this.repository.upsert(input);
  }

  private validate(input: WaitingRoomConfigInput): void {
    if (input.maxConcurrency <= 0) {
      throw new WaitingRoomInvalidConfigError('maxConcurrency must be positive');
    }
    if (input.admissionTtlSeconds <= 0) {
      throw new WaitingRoomInvalidConfigError(
        'admissionTtlSeconds must be positive',
      );
    }
    if (input.activateThreshold <= 0) {
      throw new WaitingRoomInvalidConfigError('activateThreshold must be positive');
    }
    if (input.deactivateThreshold < 0) {
      throw new WaitingRoomInvalidConfigError(
        'deactivateThreshold must be non-negative',
      );
    }
    if (input.deactivateThreshold >= input.activateThreshold) {
      throw new WaitingRoomInvalidConfigError(
        'deactivateThreshold must be below activateThreshold',
      );
    }
    if (input.cooldownSeconds < 0) {
      throw new WaitingRoomInvalidConfigError('cooldownSeconds must be non-negative');
    }
  }
}
