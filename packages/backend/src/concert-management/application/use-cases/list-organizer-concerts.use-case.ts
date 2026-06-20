import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';

export class ListOrganizerConcertsUseCase {
  constructor(private readonly concertWriteRepo: ConcertWriteRepositoryPort) {}

  async execute(organizerId: string): Promise<Concert[]> {
    return this.concertWriteRepo.findConcertsByOwner(organizerId);
  }
}
