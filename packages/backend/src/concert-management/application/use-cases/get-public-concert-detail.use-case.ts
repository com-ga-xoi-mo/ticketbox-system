import type { ConcertDetail } from '../../domain/catalog.types';
import { PublicConcertNotFoundError } from '../../domain/errors';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';

export class GetPublicConcertDetailUseCase {
  constructor(private readonly catalog: PublicConcertCatalogPort) {}

  async execute(slug: string, now = new Date()): Promise<ConcertDetail> {
    const concert = await this.catalog.findPublishedUpcomingDetailBySlug(slug, now);
    if (!concert) {
      throw new PublicConcertNotFoundError(slug);
    }
    return concert;
  }
}
