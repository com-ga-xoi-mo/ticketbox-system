import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const adminScope = { role: 'ADMIN' as const, sub: '' };

export function useConcerts() {
  return useQuery({
    queryKey: concertKeys.list(adminScope),
    queryFn: () => listConcerts(),
  });
}

export function useConcert(id: string) {
  return useQuery({
    queryKey: concertKeys.detail(adminScope, id),
    queryFn: () => getConcert(id),
    enabled: !!id,
  });
}

export function useCreateConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) => createConcert(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
    },
  });
}

export function useUpdateConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      updateConcert(id, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, data.id) });
    },
  });
}

export function usePublishConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => publishConcert(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(adminScope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(adminScope, data.id) });
    },
  });
}

export function useCancelConcertMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelConcert(id),
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
