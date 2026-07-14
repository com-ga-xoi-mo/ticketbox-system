import { Inject, Injectable } from '@nestjs/common';

import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
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
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(input: {
    concertId: string;
    manualOverride: WaitingRoomManualOverride;
    actor: Actor;
    allowAdminOverride: boolean;
  }): Promise<WaitingRoomConfigRecord> {
    await this.authorizeConcertManagement.execute({
      actor: input.actor,
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });
    if (!(await this.repository.concertExists(input.concertId))) {
      throw new ConcertNotFoundError(input.concertId);
    }
    const config = await this.repository.setManualOverride(input);
    if (!config) {
      throw new WaitingRoomConcertNotFoundError(input.concertId);
    }
    return config;
  }
}
