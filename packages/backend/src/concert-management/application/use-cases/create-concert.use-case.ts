import type { Concert } from '../../domain/concert.types';
import {
  ConcertSlugAlreadyExistsError,
  InvalidConcertSlugError,
  MissingConcertFieldsError,
} from '../../domain/errors';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { CreateConcertCommand } from './commands';

export class CreateConcertUseCase {
  constructor(private readonly concertWriteRepo: ConcertWriteRepositoryPort) {}

  async execute(cmd: CreateConcertCommand): Promise<Concert> {
    if (
      !cmd.createdById ||
      !cmd.slug ||
      !cmd.title ||
      !cmd.artistName ||
      !cmd.venueName ||
      !cmd.city ||
      !cmd.startsAt ||
      !cmd.endsAt
    ) {
      throw new MissingConcertFieldsError();
    }

    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(cmd.slug)) {
      throw new InvalidConcertSlugError(cmd.slug);
    }

    try {
      return await this.concertWriteRepo.createConcert({
        createdById: cmd.createdById,
        slug: cmd.slug,
        title: cmd.title,
        artistName: cmd.artistName,
        venueName: cmd.venueName,
        venueAddress: cmd.venueAddress,
        city: cmd.city,
        startsAt: cmd.startsAt,
        endsAt: cmd.endsAt,
        description: cmd.description,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConcertSlugAlreadyExistsError(cmd.slug);
      }
      throw err;
    }
  }
}
