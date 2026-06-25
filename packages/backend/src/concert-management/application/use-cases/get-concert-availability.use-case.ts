import type { ConcertAvailabilitySnapshot } from '../../domain/catalog.types';
import { PublicConcertNotFoundError } from '../../domain/errors';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class GetConcertAvailabilityUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(slug: string, now = new Date()): Promise<ConcertAvailabilitySnapshot> {
    const snapshot = await this.catalog.findPublishedUpcomingAvailabilityBySlug(slug, now);
    if (!snapshot) {
      throw new PublicConcertNotFoundError(slug);
    }
    return snapshot;
  }
}
