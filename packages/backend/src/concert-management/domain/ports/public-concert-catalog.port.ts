import type {
  CatalogSearchFilters,
  ConcertAvailabilitySnapshot,
  ConcertDetail,
  ConcertSummary,
} from '../catalog.types';

export const PUBLIC_CONCERT_CATALOG = Symbol('PUBLIC_CONCERT_CATALOG');

export type PublicConcertCatalogPort = {
  listUpcomingPublished(now: Date, filters?: CatalogSearchFilters): Promise<ConcertSummary[]>;
  listDistinctCities(now: Date): Promise<string[]>;
  findPublishedUpcomingDetailBySlug(slug: string, now: Date): Promise<ConcertDetail | null>;
  findPublishedUpcomingAvailabilityBySlug(
    slug: string,
    now: Date,
  ): Promise<ConcertAvailabilitySnapshot | null>;
};
