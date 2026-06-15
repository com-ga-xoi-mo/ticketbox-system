import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../domain/errors';
import type { ConcertOwnershipRepositoryPort } from '../../domain/ports/concert-ownership.port';
import { Role } from '../../domain/role.enum';
import type { ConcertAuthorizationCommand } from './authorization.types';

export class AuthorizeConcertManagementUseCase {
  constructor(private readonly concertOwnershipRepo: ConcertOwnershipRepositoryPort) {}

  async execute(cmd: ConcertAuthorizationCommand): Promise<void> {
    if (cmd.allowAdminOverride === true && cmd.actor.roles.includes(Role.ADMIN)) {
      return;
    }

    if (!cmd.actor.roles.includes(Role.ORGANIZER)) {
      throw new ForbiddenConcertOwnershipError(cmd.concertId);
    }

    const ownership = await this.concertOwnershipRepo.findOwnership(cmd.concertId);
    if (!ownership) {
      throw new ConcertNotFoundError(cmd.concertId);
    }

    if (ownership.ownerUserId !== cmd.actor.userId) {
      throw new ForbiddenConcertOwnershipError(cmd.concertId);
    }
  }
}
