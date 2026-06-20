import { ConcertNotFoundError } from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';

export class GetOrganizerConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(params: { concertId: string; organizerId: string }): Promise<Concert> {
    const actor = {
      userId: params.organizerId,
      roles: [Role.ORGANIZER],
    };

    await this.authorizeConcertManagement.execute({
      actor,
      concertId: params.concertId,
      allowAdminOverride: false,
    });

    const concert = await this.concertWriteRepo.findConcertById(params.concertId);
    if (!concert) {
      throw new ConcertNotFoundError(params.concertId);
    }

    return concert;
  }
}
