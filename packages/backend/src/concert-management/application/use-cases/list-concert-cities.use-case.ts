import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class ListConcertCitiesUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(now = new Date()): Promise<string[]> {
    return this.catalog.listDistinctCities(now);
  }
}
