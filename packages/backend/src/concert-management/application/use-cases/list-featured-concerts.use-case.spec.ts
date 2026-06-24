import { describe, expect, it, vi } from 'vitest';

import { ListFeaturedConcertsUseCase } from './list-featured-concerts.use-case';
import type { PublicConcertCatalogPort } from '../../domain/ports/public-concert-catalog.port';
import type { FeaturedConcert } from '../../domain/catalog.types';

describe('ListFeaturedConcertsUseCase', () => {
  it('caps the limit at 20 and forwards to catalog', async () => {
    const listFeaturedPublished = vi.fn().mockResolvedValue([]);
    const catalog = { listFeaturedPublished } as unknown as PublicConcertCatalogPort;
    const useCase = new ListFeaturedConcertsUseCase(catalog);
    
    const now = new Date();
    await useCase.execute(now, 50);
    
    expect(listFeaturedPublished).toHaveBeenCalledWith(now, 20);
  });

  it('defaults the limit to 10', async () => {
    const listFeaturedPublished = vi.fn().mockResolvedValue([]);
    const catalog = { listFeaturedPublished } as unknown as PublicConcertCatalogPort;
    const useCase = new ListFeaturedConcertsUseCase(catalog);
    
    const now = new Date();
    await useCase.execute(now);
    
    expect(listFeaturedPublished).toHaveBeenCalledWith(now, 10);
  });
  
  it('ensures minimum limit is 1', async () => {
    const listFeaturedPublished = vi.fn().mockResolvedValue([]);
    const catalog = { listFeaturedPublished } as unknown as PublicConcertCatalogPort;
    const useCase = new ListFeaturedConcertsUseCase(catalog);
    
    const now = new Date();
    await useCase.execute(now, -5);
    
    expect(listFeaturedPublished).toHaveBeenCalledWith(now, 1);
  });
});