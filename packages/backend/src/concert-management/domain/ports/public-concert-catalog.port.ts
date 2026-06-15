import type { ConcertAvailabilitySnapshot, ConcertDetail, ConcertSummary } from '../catalog.types';

export const PUBLIC_CONCERT_CATALOG = Symbol('PUBLIC_CONCERT_CATALOG');

export type PublicConcertCatalogPort = {
  listUpcomingPublished(now: Date): Promise<ConcertSummary[]>;
  findPublishedUpcomingDetailBySlug(slug: string, now: Date): Promise<ConcertDetail | null>;
  findPublishedUpcomingAvailabilityBySlug(
    slug: string,
    now: Date,
  ): Promise<ConcertAvailabilitySnapshot | null>;
};
