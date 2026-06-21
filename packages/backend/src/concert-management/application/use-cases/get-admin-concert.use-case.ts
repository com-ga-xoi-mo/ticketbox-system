import { ConcertNotFoundError } from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';

export class GetAdminConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(params: { concertId: string; adminId: string }): Promise<Concert> {
    const actor = {
      userId: params.adminId,
      roles: [Role.ADMIN],
    };

    await this.authorizeConcertManagement.execute({
      actor,
      concertId: params.concertId,
      allowAdminOverride: true,
    });

    const concert = await this.concertWriteRepo.findConcertById(params.concertId);
    if (!concert) {
      throw new ConcertNotFoundError(params.concertId);
    }

    return concert;
  }
}
