import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ArtistBioNotFoundError } from '../../domain/errors';
import type { ArtistBioActor, ArtistBioRecord } from '../../domain/artist-bio.types';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';

export interface GetArtistBioJobCommand {
  concertId: string;
  actor: ArtistBioActor;
  allowAdminOverride: boolean;
}

export class GetArtistBioJobUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: GetArtistBioJobCommand): Promise<ArtistBioRecord> {
    await this.authorizeConcertManagement.execute({
      concertId: cmd.concertId,
      actor: cmd.actor,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const artistBio = await this.repository.findLatestForConcert(cmd.concertId);
    if (!artistBio) {
      throw new ArtistBioNotFoundError(cmd.concertId);
    }
    return artistBio;
  }
}

