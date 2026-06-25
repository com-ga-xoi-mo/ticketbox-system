import { describe, expect, it, vi } from 'vitest';

import { PublicConcertNotFoundError } from '../../domain/errors';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';
import { GetConcertAvailabilityUseCase } from './get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from './get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from './list-public-concerts.use-case';
import { ListConcertCitiesUseCase } from './list-concert-cities.use-case';

const now = new Date('2026-06-15T00:00:00.000Z');

describe('public concert catalog use cases', () => {
  it('delegates upcoming published list reads to the catalog port with the supplied clock and filters', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn().mockResolvedValue([]),
      listFeaturedPublished: vi.fn().mockResolvedValue([]),
      listDistinctCities: vi.fn(),
      findPublishedUpcomingDetailBySlug: vi.fn(),
      findPublishedUpcomingAvailabilityBySlug: vi.fn(),
    };

    const filters = { q: 'jazz', city: 'HCMC', sortBy: 'price' as const, sortDir: 'asc' as const };
    await expect(new ListPublicConcertsUseCase(catalog).execute(now, filters)).resolves.toEqual([]);
    expect(catalog.listUpcomingPublished).toHaveBeenCalledWith(now, filters);
  });

  it('delegates distinct cities list reads to the catalog port', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn(),
      listFeaturedPublished: vi.fn(),
      listDistinctCities: vi.fn().mockResolvedValue(['HCMC', 'Hanoi']),
      findPublishedUpcomingDetailBySlug: vi.fn(),
      findPublishedUpcomingAvailabilityBySlug: vi.fn(),
    };

    await expect(new ListConcertCitiesUseCase(catalog).execute(now)).resolves.toEqual(['HCMC', 'Hanoi']);
    expect(catalog.listDistinctCities).toHaveBeenCalledWith(now);
  });

  it('throws a not-found error for non-public or missing detail records', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn(),
      listFeaturedPublished: vi.fn(),
      listDistinctCities: vi.fn(),
      findPublishedUpcomingDetailBySlug: vi.fn().mockResolvedValue(null),
      findPublishedUpcomingAvailabilityBySlug: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetPublicConcertDetailUseCase(catalog).execute('draft-concert', now),
    ).rejects.toThrow(PublicConcertNotFoundError);
  });

  it('throws a not-found error for non-public or missing availability records', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn(),
      listFeaturedPublished: vi.fn(),
      listDistinctCities: vi.fn(),
      findPublishedUpcomingDetailBySlug: vi.fn(),
      findPublishedUpcomingAvailabilityBySlug: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetConcertAvailabilityUseCase(catalog).execute('draft-concert', now),
    ).rejects.toThrow(PublicConcertNotFoundError);
  });
});
