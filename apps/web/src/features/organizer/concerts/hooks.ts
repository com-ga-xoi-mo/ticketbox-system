import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../shared/auth/AuthContext';
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
} from './api';

export function useOrganizerScope() {
  const { session } = useAuth();
  return { role: 'ORGANIZER' as const, sub: session?.sub ?? '' };
}

export function useConcerts() {
  const scope = useOrganizerScope();
  return useQuery({
    queryKey: concertKeys.list(scope),
    queryFn: async () => {
      const data = await listConcerts();
      return data.map(d => parseResponse(ManagementConcertResponseSchema, d));
    },
  });
}

export function useConcert(id: string) {
  const scope = useOrganizerScope();
  return useQuery({
    queryKey: concertKeys.detail(scope, id),
    queryFn: async () => {
      const data = await getConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    enabled: !!id,
  });
}

export function useCreateConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const data = await createConcert(payload);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
    },
  });
}

export function useUpdateConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: unknown }) => {
      const data = await updateConcert(id, payload);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}

export function usePublishConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await publishConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}

export function useCancelConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await cancelConcert(id);
      return parseResponse(ManagementConcertResponseSchema, data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}

export function useUploadPosterMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadPoster(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, id) });
    },
  });
}

export function useUploadBannerMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadBanner(id, file),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, id) });
    },
  });
}

export function useReplaceArtistsMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => replaceArtists(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, id) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
    },
  });
}
