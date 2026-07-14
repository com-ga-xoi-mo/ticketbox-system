import { Inject, Injectable } from '@nestjs/common';

import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
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
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(input: {
    concertId: string;
    actor: Actor;
    allowAdminOverride: boolean;
  }): Promise<WaitingRoomConfigRecord | null> {
    await this.authorizeConcertManagement.execute({
      actor: input.actor,
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });
    await this.assertConcertExists(input.concertId);
    return this.repository.findByConcertId(input.concertId);
  }

  private async assertConcertExists(concertId: string): Promise<void> {
    if (!(await this.repository.concertExists(concertId))) {
      throw new ConcertNotFoundError(concertId);
    }
  }
}
