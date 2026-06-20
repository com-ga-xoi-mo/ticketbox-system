import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { CancelConcertCommand } from './commands';
import { checkConcertStatusTransition } from './status-transition.helper';

export class CancelConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: CancelConcertCommand): Promise<Concert> {
    const actor = {
      userId: cmd.requesterId,
      roles: [cmd.requesterRole],
    };

    await this.authorizeConcertManagement.execute({
      actor,
      concertId: cmd.concertId,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const concert = await this.concertWriteRepo.findConcertById(cmd.concertId);
    if (!concert) {
      throw new ConcertNotFoundError(cmd.concertId);
    }

    checkConcertStatusTransition(concert.status, 'CANCELLED');

    return this.concertWriteRepo.updateConcert(cmd.concertId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });
  }
}
