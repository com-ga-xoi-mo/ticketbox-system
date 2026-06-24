import type { CatalogSearchFilters, ConcertSummary } from '../../domain/catalog.types';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class ListPublicConcertsUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(now = new Date(), filters?: CatalogSearchFilters): Promise<ConcertSummary[]> {
    return this.catalog.listUpcomingPublished(now, filters);
  }
}
