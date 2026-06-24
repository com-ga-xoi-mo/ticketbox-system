import { describe, expect, it, vi } from 'vitest';
import { fetchConcertList, fetchConcertCities } from './catalog';
import { apiGet } from './client';
import { PublicConcertListResponseSchema, PublicConcertCitiesResponseSchema } from '@ticketbox/api-types';

vi.mock('./client', () => ({
  apiGet: vi.fn(),
}));

describe('Catalog API', () => {
  it('fetchConcertList calls apiGet with no params', async () => {
    const mockData: never[] = [];
    vi.mocked(apiGet).mockResolvedValue(mockData);
    
    await fetchConcertList();
    expect(apiGet).toHaveBeenCalledWith('/concerts');
  });

  it('fetchConcertList calls apiGet with query params', async () => {
    const mockData: never[] = [];
    vi.mocked(apiGet).mockResolvedValue(mockData);
    
    await fetchConcertList({ q: 'rock', city: 'Hanoi', minPrice: 100000 });
    expect(apiGet).toHaveBeenCalledWith('/concerts?q=rock&city=Hanoi&minPrice=100000');
  });

  it('fetchConcertCities calls apiGet', async () => {
    const mockData = ['Hanoi'];
    vi.mocked(apiGet).mockResolvedValue(mockData);
    
    await fetchConcertCities();
    expect(apiGet).toHaveBeenCalledWith('/concerts/cities');
  });
});
