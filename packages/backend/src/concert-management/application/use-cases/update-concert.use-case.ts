import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { ConcertNotFoundError } from '../../../identity/domain/errors';
import type { Concert } from '../../domain/concert.types';
import {
  ConcertNotEditableError,
  ConcertSlugAlreadyExistsError,
  InvalidConcertSlugError,
} from '../../domain/errors';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { UpdateConcertCommand } from './commands';

export class UpdateConcertUseCase {
  constructor(
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
  ) {}

  async execute(cmd: UpdateConcertCommand): Promise<Concert> {
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

    if (concert.status === 'ENDED' || concert.status === 'CANCELLED') {
      throw new ConcertNotEditableError(concert.status);
    }

    if (cmd.slug) {
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(cmd.slug)) {
        throw new InvalidConcertSlugError(cmd.slug);
      }
    }

    try {
      return await this.concertWriteRepo.updateConcert(cmd.concertId, {
        title: cmd.title,
        artistName: cmd.artistName,
        venueName: cmd.venueName,
        venueAddress: cmd.venueAddress,
        city: cmd.city,
        startsAt: cmd.startsAt,
        endsAt: cmd.endsAt,
        description: cmd.description,
        slug: cmd.slug,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConcertSlugAlreadyExistsError(cmd.slug ?? '');
      }
      throw err;
    }
  }
}
