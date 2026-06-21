import type { Concert } from '../../domain/concert.types';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';

export class ListAdminConcertsUseCase {
  constructor(private readonly concertWriteRepo: ConcertWriteRepositoryPort) {}

  async execute(): Promise<Concert[]> {
    return this.concertWriteRepo.findAllConcerts();
  }
}
