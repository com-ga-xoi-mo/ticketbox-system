import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../shared/auth/AuthContext';
import { concertKeys } from './query-keys';
import {
  listConcerts,
  getConcert,
  createConcert,
  updateConcert,
  publishConcert,
  cancelConcert,
} from './api';

export function useConcertSession() {
  const { session } = useAuth();
  const role = (session?.roles ?? []).includes('ADMIN') ? 'ADMIN' : 'ORGANIZER';
  const sub = session?.sub ?? '';
  const basePath = role === 'ADMIN' ? '/admin/concerts' : '/organizer/concerts';
  const scope = { role, sub };

  return { role, basePath, scope };
}

export function useConcerts() {
  const { basePath, scope } = useConcertSession();
  return useQuery({
    queryKey: concertKeys.list(scope),
    queryFn: () => listConcerts(basePath),
  });
}

export function useConcert(id: string) {
  const { basePath, scope } = useConcertSession();
  return useQuery({
    queryKey: concertKeys.detail(scope, id),
    queryFn: () => getConcert(basePath, id),
    enabled: !!id,
  });
}

export function useCreateConcertMutation() {
  const queryClient = useQueryClient();
  const { basePath, scope } = useConcertSession();

  return useMutation({
    mutationFn: (payload: unknown) => createConcert(basePath, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
    },
  });
}

export function useUpdateConcertMutation() {
  const queryClient = useQueryClient();
  const { basePath, scope } = useConcertSession();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      updateConcert(basePath, id, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}

export function usePublishConcertMutation() {
  const queryClient = useQueryClient();
  const { basePath, scope } = useConcertSession();

  return useMutation({
    mutationFn: (id: string) => publishConcert(basePath, id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}

export function useCancelConcertMutation() {
  const queryClient = useQueryClient();
  const { basePath, scope } = useConcertSession();

  return useMutation({
    mutationFn: (id: string) => cancelConcert(basePath, id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: concertKeys.list(scope) });
      void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, data.id) });
    },
  });
}
