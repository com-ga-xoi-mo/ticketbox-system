import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ArtistBioNotFoundError, ArtistBioStatusTransitionError } from '../../domain/errors';
import { ArtistBioStatus, type ArtistBioActor, type ArtistBioRecord } from '../../domain/artist-bio.types';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';

export interface PublishArtistBioCommand {
  artistBioId: string;
  concertId: string;
  actor: ArtistBioActor;
  allowAdminOverride: boolean;
  publishedAt?: Date;
}

export class PublishArtistBioUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: PublishArtistBioCommand): Promise<ArtistBioRecord> {
    await this.authorizeConcertManagement.execute({
      concertId: cmd.concertId,
      actor: cmd.actor,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const existing = await this.repository.findById(cmd.artistBioId);
    if (!existing || existing.concertId !== cmd.concertId) {
      throw new ArtistBioNotFoundError(cmd.artistBioId);
    }
    if (existing.status !== ArtistBioStatus.READY_FOR_REVIEW) {
      throw new ArtistBioStatusTransitionError('Only ready-for-review artist bios can be published.');
    }

    return this.repository.publish({
      artistBioId: cmd.artistBioId,
      reviewedById: cmd.actor.userId,
      publishedAt: cmd.publishedAt ?? new Date(),
    });
  }
}

