import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concertKeys } from '../../concerts-shared/query-keys';
import { ManagementConcertResponseSchema } from '@ticketbox/api-types';
import { parseResponse } from '../../../shared/api/parse-response';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
  uploadPoster,
  uploadBanner,
  replaceArtists,
  listConcertReviews,
  hideConcertReview,
} from './api';

const adminScope = { role: 'ADMIN' as const, sub: '' };

export function useConcerts() {
  return useQuery({
    queryKey: concertKeys.list(adminScope),
    queryFn: async () => {
      const data = await listConcerts();
      return data.map(d => parseResponse(ManagementConcertResponseSchema, d));
    },
  });
}

export function useConcert(id: string) {
  return useQuery({
    queryKey: concertKeys.detail(adminScope, id),
    queryFn: async () => {
      const data = await getConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    enabled: !!id,
  });
}

export function useCreateConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const data = await createConcert(payload);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
    },
  });
}

export function useUpdateConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: unknown }) => {
      const data = await updateConcert(id, payload);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, data.id) });
    },
  });
}

export function usePublishConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await publishConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, data.id) });
    },
  });
}

export function useCancelConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await cancelConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, data.id) });
    },
  });
}

export function useUploadPosterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadPoster(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, id) });
    },
  });
}

export function useUploadBannerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadBanner(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, id) });
    },
  });
}

export function useReplaceArtistsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => replaceArtists(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, id) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
    },
  });
}

export const adminConcertReviewKeys = {
  list: (concertSlug: string) => ['admin-concert-reviews', concertSlug] as const,
};

export function useConcertReviews(concertSlug: string | undefined) {
  return useQuery({
    queryKey: adminConcertReviewKeys.list(concertSlug ?? ''),
    queryFn: () => listConcertReviews(concertSlug as string),
    enabled: !!concertSlug,
  });
}

export function useHideConcertReviewMutation(concertId: string, concertSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason?: string }) =>
      hideConcertReview(concertId, reviewId, reason ? { reason } : {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminConcertReviewKeys.list(concertSlug) });
    },
  });
}
