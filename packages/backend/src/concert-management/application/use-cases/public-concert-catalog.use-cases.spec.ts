import { describe, expect, it, vi } from 'vitest';

import { PublicConcertNotFoundError } from '../../domain/errors';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';
import { GetConcertAvailabilityUseCase } from './get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from './get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from './list-public-concerts.use-case';

const now = new Date('2026-06-15T00:00:00.000Z');

describe('public concert catalog use cases', () => {
  it('delegates upcoming published list reads to the catalog port with the supplied clock', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn().mockResolvedValue([]),
      findPublishedUpcomingDetailBySlug: vi.fn(),
      findPublishedUpcomingAvailabilityBySlug: vi.fn(),
    };

    await expect(new ListPublicConcertsUseCase(catalog).execute(now)).resolves.toEqual([]);
    expect(catalog.listUpcomingPublished).toHaveBeenCalledWith(now);
  });

  it('throws a not-found error for non-public or missing detail records', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn(),
      findPublishedUpcomingDetailBySlug: vi.fn().mockResolvedValue(null),
      findPublishedUpcomingAvailabilityBySlug: vi.fn(),
    };

    await expect(
      new GetPublicConcertDetailUseCase(catalog).execute('draft-concert', now),
    ).rejects.toThrow(PublicConcertNotFoundError);
  });

  it('throws a not-found error for non-public or missing availability records', async () => {
    const catalog: PublicConcertCatalogPort = {
      listUpcomingPublished: vi.fn(),
      findPublishedUpcomingDetailBySlug: vi.fn(),
      findPublishedUpcomingAvailabilityBySlug: vi.fn().mockResolvedValue(null),
    };

    await expect(
      new GetConcertAvailabilityUseCase(catalog).execute('draft-concert', now),
    ).rejects.toThrow(PublicConcertNotFoundError);
  });
});
