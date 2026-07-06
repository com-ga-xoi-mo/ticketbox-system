import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listArtists,
  createArtist,
  updateArtist,
  uploadArtistAvatar,
  uploadArtistPoster,
} from './api';
import {
  ManagementArtistResponseSchema,
  AdminArtistListResponseSchema,
  UploadArtistAssetResponseSchema,
} from '@ticketbox/api-types';
import { parseResponse } from '../../../shared/api/parse-response';

export const artistKeys = {
  all: ['admin-artists'] as const,
  lists: () => [...artistKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) => [...artistKeys.lists(), filters] as const,
  details: () => [...artistKeys.all, 'detail'] as const,
  detail: (id: string) => [...artistKeys.details(), id] as const,
};

export function useAdminArtists(filters: Record<string, string | number>) {
  return useQuery({
    queryKey: artistKeys.list(filters),
    queryFn: async () => {
      const data = await listArtists(filters);
      return parseResponse(AdminArtistListResponseSchema, data);
    },
  });
}

export function useCreateArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const data = await createArtist(payload);
      return parseResponse(ManagementArtistResponseSchema, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
}

export function useUpdateArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: unknown }) => {
      const data = await updateArtist(id, payload);
      return parseResponse(ManagementArtistResponseSchema, data);
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: artistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
}

export function useUploadArtistAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const data = await uploadArtistAvatar(id, file);
      return parseResponse(UploadArtistAssetResponseSchema, data);
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: artistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
}

export function useUploadArtistPosterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const data = await uploadArtistPoster(id, file);
      return parseResponse(UploadArtistAssetResponseSchema, data);
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: artistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
}
