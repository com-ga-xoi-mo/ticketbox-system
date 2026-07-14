import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ArtistBioResponse } from '@ticketbox/api-types';

import { concertKeys } from '../concerts-shared/query-keys';
import { useAuth } from '../../shared/auth/AuthContext';
import { createArtistBioApi, type ArtistBioManagementRole } from './api';

export interface ArtistBioScope {
  role: ArtistBioManagementRole;
  sub: string;
}

export const artistBioKeys = {
  all: ['artist-bio'] as const,
  detail: (scope: ArtistBioScope, concertId: string) =>
    [...artistBioKeys.all, scope, concertId] as const,
};

export function useArtistBioScope(role: ArtistBioManagementRole): ArtistBioScope {
  const { session } = useAuth();
  return { role, sub: session?.sub ?? '' };
}

export function artistBioRefetchInterval(
  bio: ArtistBioResponse | null | undefined,
): number | false {
  return bio?.status === 'DRAFT' || bio?.status === 'PROCESSING' ? 5_000 : false;
}

export function useArtistBio(scope: ArtistBioScope, concertId: string) {
  const api = createArtistBioApi(scope.role);
  return useQuery({
    queryKey: artistBioKeys.detail(scope, concertId),
    queryFn: () => api.fetchArtistBio(concertId),
    enabled: Boolean(concertId),
    refetchInterval: (query) => artistBioRefetchInterval(query.state.data),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useArtistBioMutations(scope: ArtistBioScope) {
  const queryClient = useQueryClient();
  const api = createArtistBioApi(scope.role);

  function updateCache(concertId: string, result: ArtistBioResponse) {
    queryClient.setQueryData(artistBioKeys.detail(scope, concertId), result);
    void queryClient.invalidateQueries({ queryKey: concertKeys.detail(scope, concertId) });
  }

  const upload = useMutation({
    mutationFn: ({ concertId, file }: { concertId: string; file: File }) =>
      api.uploadArtistBioPressKit(concertId, file),
    onSuccess: (result, { concertId }) => updateCache(concertId, result),
  });
  const retry = useMutation({
    mutationFn: ({ concertId, id }: { concertId: string; id: string }) =>
      api.retryArtistBio(concertId, id),
    onSuccess: (result, { concertId }) => updateCache(concertId, result),
  });
  const publish = useMutation({
    mutationFn: ({ concertId, id }: { concertId: string; id: string }) =>
      api.publishArtistBio(concertId, id),
    onSuccess: (result, { concertId }) => updateCache(concertId, result),
  });
  const reject = useMutation({
    mutationFn: ({ concertId, id }: { concertId: string; id: string }) =>
      api.rejectArtistBio(concertId, id),
    onSuccess: (result, { concertId }) => updateCache(concertId, result),
  });

  return { upload, retry, publish, reject };
}
