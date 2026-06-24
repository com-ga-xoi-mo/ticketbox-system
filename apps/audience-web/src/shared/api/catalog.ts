import { useQuery } from '@tanstack/react-query';
import {
  PublicConcertAvailabilityResponseSchema,
  PublicConcertCitiesResponseSchema,
  PublicConcertDetailResponseSchema,
  PublicConcertListResponseSchema,
  type CatalogSearchParams,
  type PublicConcertAvailabilityResponse,
  type PublicConcertCitiesResponse,
  type PublicConcertDetailResponse,
  type PublicConcertListResponse,
} from '@ticketbox/api-types';
import { apiGet } from './client';

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (params?: CatalogSearchParams) => [...catalogKeys.all, 'list', params ?? {}] as const,
  detail: (slug: string) => [...catalogKeys.all, 'detail', slug] as const,
  availability: (slug: string) => [...catalogKeys.all, 'availability', slug] as const,
  cities: () => [...catalogKeys.all, 'cities'] as const,
};

export async function fetchConcertList(
  params?: CatalogSearchParams,
): Promise<PublicConcertListResponse> {
  let url = '/concerts';
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  const data = await apiGet<unknown>(url);
  return PublicConcertListResponseSchema.parse(data);
}

export async function fetchConcertCities(): Promise<PublicConcertCitiesResponse> {
  const data = await apiGet<unknown>('/concerts/cities');
  return PublicConcertCitiesResponseSchema.parse(data);
}

export async function fetchConcertDetail(slug: string): Promise<PublicConcertDetailResponse> {
  const data = await apiGet<unknown>(`/concerts/${slug}`);
  return PublicConcertDetailResponseSchema.parse(data);
}

export async function fetchConcertAvailability(
  slug: string,
): Promise<PublicConcertAvailabilityResponse> {
  const data = await apiGet<unknown>(`/concerts/${slug}/availability`);
  return PublicConcertAvailabilityResponseSchema.parse(data);
}

export function useConcertList(params?: CatalogSearchParams) {
  return useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: () => fetchConcertList(params),
  });
}

export function useConcertCities() {
  return useQuery({
    queryKey: catalogKeys.cities(),
    queryFn: fetchConcertCities,
  });
}
