import { Inject, Injectable } from '@nestjs/common';

import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
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
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(
    input: WaitingRoomConfigInput & { actor: Actor; allowAdminOverride: boolean },
  ): Promise<WaitingRoomConfigRecord> {
    await this.authorizeConcertManagement.execute({
      actor: input.actor,
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });
    await this.assertConcertExists(input.concertId);
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

  private async assertConcertExists(concertId: string): Promise<void> {
    if (!(await this.repository.concertExists(concertId))) {
      throw new ConcertNotFoundError(concertId);
    }
  }
}
