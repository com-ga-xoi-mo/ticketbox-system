import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ArtistNotFoundError } from '../../domain/errors';
import { Role } from '../../../identity/domain/role.enum';

export interface SetConcertArtistsCommand {
  concertId: string;
  artists: { artistId: string; displayOrder: number }[];
  actor: { userId: string; roles: string[] };
  allowAdminOverride: boolean;
}

export class SetConcertArtistsUseCase {
  constructor(
    private readonly repository: ArtistRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(command: SetConcertArtistsCommand): Promise<void> {
    await this.authorizeConcertManagement.execute({
      concertId: command.concertId,
      actor: {
        userId: command.actor.userId,
        roles: command.actor.roles as Role[],
      },
      allowAdminOverride: command.allowAdminOverride,
    });

    for (const item of command.artists) {
      const artist = await this.repository.findById(item.artistId);
      if (!artist) {
        throw new ArtistNotFoundError(item.artistId);
      }
    }

    await this.repository.setConcertArtists({
      concertId: command.concertId,
      artists: command.artists,
    });
  }
}
