import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ArtistBioNotFoundError, ArtistBioStatusTransitionError } from '../../domain/errors';
import { ArtistBioStatus, type ArtistBioActor, type ArtistBioRecord } from '../../domain/artist-bio.types';
import type { ArtistBioQueuePort } from '../../domain/ports/artist-bio-queue.port';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';

export interface RetryArtistBioJobCommand {
  artistBioId: string;
  concertId: string;
  actor: ArtistBioActor;
  allowAdminOverride: boolean;
}

export class RetryArtistBioJobUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly queue: ArtistBioQueuePort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: RetryArtistBioJobCommand): Promise<ArtistBioRecord> {
    await this.authorizeConcertManagement.execute({
      concertId: cmd.concertId,
      actor: cmd.actor,
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const existing = await this.repository.findById(cmd.artistBioId);
    if (!existing || existing.concertId !== cmd.concertId) {
      throw new ArtistBioNotFoundError(cmd.artistBioId);
    }
    if (existing.status !== ArtistBioStatus.FAILED) {
      throw new ArtistBioStatusTransitionError('Only failed artist bio jobs can be retried.');
    }
    if (existing.retryCount >= existing.maxAttempts) {
      throw new ArtistBioStatusTransitionError('Artist bio job has exhausted retry attempts.');
    }
    if (existing.nextRetryAt && existing.nextRetryAt.getTime() > Date.now()) {
      throw new ArtistBioStatusTransitionError(
        'Artist bio job is not ready to retry yet.',
      );
    }

    const reset = await this.repository.resetFailedForRetry(cmd.artistBioId);
    await this.queue.enqueueRequested(reset.id);
    return reset;
  }
}
