import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ArtistBioNotFoundError, ArtistBioStatusTransitionError } from '../../domain/errors';
import {
  ArtistBioStatus,
  type ArtistBioActor,
  type ArtistBioRecord,
} from '../../domain/artist-bio.types';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';

export interface RejectArtistBioCommand {
  artistBioId: string;
  concertId: string;
  actor: ArtistBioActor;
  allowAdminOverride: boolean;
}

export class RejectArtistBioUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: RejectArtistBioCommand): Promise<ArtistBioRecord> {
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
      throw new ArtistBioStatusTransitionError(
        'Only ready-for-review artist bios can be rejected.',
      );
    }

    return this.repository.updateStatus(cmd.artistBioId, ArtistBioStatus.DRAFT);
  }
}
