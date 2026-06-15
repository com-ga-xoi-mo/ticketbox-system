import type { ConcertSummary } from '../../domain/catalog.types';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class ListPublicConcertsUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(now = new Date()): Promise<ConcertSummary[]> {
    return this.catalog.listUpcomingPublished(now);
  }
}
