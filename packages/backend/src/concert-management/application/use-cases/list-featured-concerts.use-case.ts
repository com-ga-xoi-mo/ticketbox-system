import type { FeaturedConcert } from '../../domain/catalog.types';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class ListFeaturedConcertsUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(now = new Date(), limit = 10): Promise<FeaturedConcert[]> {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);
    return this.catalog.listFeaturedPublished(now, cappedLimit);
  }
}
