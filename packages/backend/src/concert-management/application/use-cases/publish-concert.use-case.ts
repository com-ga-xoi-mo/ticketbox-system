import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { PublishConcertCommand } from './commands';
import { checkConcertStatusTransition } from './status-transition.helper';

export class PublishConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: PublishConcertCommand): Promise<Concert> {
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

    checkConcertStatusTransition(concert.status, 'PUBLISHED');

    return this.concertWriteRepo.updateConcert(cmd.concertId, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
  }
}
