import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../shared/auth/AuthContext';
import { concertKeys } from '../../concerts-shared/query-keys';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
  uploadPoster,
} from './api';

export function useOrganizerScope() {
  const { session } = useAuth();
  return { role: 'ORGANIZER' as const, sub: session?.sub ?? '' };
}

export function useConcerts() {
  const scope = useOrganizerScope();
  return useQuery({
    queryKey: concertKeys.list(scope),
    queryFn: () => listConcerts(),
  });
}

export function useConcert(id: string) {
  const scope = useOrganizerScope();
  return useQuery({
    queryKey: concertKeys.detail(scope, id),
    queryFn: () => getConcert(id),
    enabled: !!id,
  });
}

export function useCreateConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: (payload: unknown) => createConcert(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
    },
  });
}

export function useUpdateConcertMutation() {
  const queryClient = useQueryClient();
  const scope = useOrganizerScope();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      updateConcert(id, payload),
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
    mutationFn: (id: string) => publishConcert(id),
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
    mutationFn: (id: string) => cancelConcert(id),
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
