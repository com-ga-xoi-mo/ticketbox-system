import {
  PublicConcertAvailabilityResponseSchema,
  PublicConcertDetailResponseSchema,
  PublicConcertListResponseSchema,
  type PublicConcertAvailabilityResponse,
  type PublicConcertDetailResponse,
  type PublicConcertListResponse,
} from '@ticketbox/api-types';
import { apiGet } from './client';

export const catalogKeys = {
  all: ['catalog'] as const,
  list: () => [...catalogKeys.all, 'list'] as const,
  detail: (slug: string) => [...catalogKeys.all, 'detail', slug] as const,
  availability: (slug: string) => [...catalogKeys.all, 'availability', slug] as const,
};

export async function fetchConcertList(): Promise<PublicConcertListResponse> {
  const data = await apiGet<unknown>('/concerts');
  return PublicConcertListResponseSchema.parse(data);
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
