import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateConcertReviewRequestSchema,
  DeleteConcertReviewResponseSchema,
  PublicConcertReviewSchema,
  PublicConcertReviewsResponseSchema,
  UpdateConcertReviewRequestSchema,
  type CreateConcertReviewRequest,
  type PublicConcertReview,
  type PublicConcertReviewsResponse,
  type UpdateConcertReviewRequest,
} from '@ticketbox/api-types';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export const concertReviewKeys = {
  all: ['concertReviews'] as const,
  bySlug: (slug: string) => [...concertReviewKeys.all, slug] as const,
};

export async function fetchConcertReviews(slug: string): Promise<PublicConcertReviewsResponse> {
  const data = await apiGet<unknown>(`/concerts/${slug}/reviews`);
  return PublicConcertReviewsResponseSchema.parse(data);
}

export async function createConcertReview(
  slug: string,
  payload: CreateConcertReviewRequest,
): Promise<PublicConcertReview> {
  const data = await apiPost<unknown>(
    `/concerts/${slug}/reviews`,
    CreateConcertReviewRequestSchema.parse(payload),
  );
  return PublicConcertReviewSchema.parse(data);
}

export async function updateMyConcertReview(
  slug: string,
  payload: UpdateConcertReviewRequest,
): Promise<PublicConcertReview> {
  const data = await apiPatch<unknown>(
    `/concerts/${slug}/reviews/me`,
    UpdateConcertReviewRequestSchema.parse(payload),
  );
  return PublicConcertReviewSchema.parse(data);
}

export async function deleteMyConcertReview(slug: string): Promise<{ deleted: true }> {
  const data = await apiDelete<unknown>(`/concerts/${slug}/reviews/me`);
  return DeleteConcertReviewResponseSchema.parse(data);
}

export function useConcertReviews(slug: string | undefined) {
  return useQuery({
    queryKey: concertReviewKeys.bySlug(slug ?? ''),
    queryFn: () => fetchConcertReviews(slug ?? ''),
    enabled: Boolean(slug),
  });
}

export function useCreateConcertReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConcertReviewRequest) => createConcertReview(slug, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertReviewKeys.bySlug(slug) });
    },
  });
}

export function useUpdateMyConcertReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateConcertReviewRequest) => updateMyConcertReview(slug, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertReviewKeys.bySlug(slug) });
    },
  });
}

export function useDeleteMyConcertReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteMyConcertReview(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertReviewKeys.bySlug(slug) });
    },
  });
}
