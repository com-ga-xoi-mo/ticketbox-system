import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  followArtist,
  unfollowArtist,
  favoriteArtist,
  unfavoriteArtist,
} from '../../../shared/api/artists';
import { artistKeys } from './keys';
import type { PublicArtistProfile } from '@ticketbox/api-types';

export function useFollowArtist(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artistId: string) => followArtist(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistKeys.profile(slug) });
      const previous = queryClient.getQueryData<PublicArtistProfile>(artistKeys.profile(slug));
      if (previous) {
        queryClient.setQueryData<PublicArtistProfile>(artistKeys.profile(slug), {
          ...previous,
          viewerFollowing: true,
          followerCount: previous.followerCount + 1,
        });
      }
      return { previous };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artistKeys.profile(slug), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artistKeys.profile(slug) });
    },
  });
}

export function useUnfollowArtist(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artistId: string) => unfollowArtist(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistKeys.profile(slug) });
      const previous = queryClient.getQueryData<PublicArtistProfile>(artistKeys.profile(slug));
      if (previous) {
        queryClient.setQueryData<PublicArtistProfile>(artistKeys.profile(slug), {
          ...previous,
          viewerFollowing: false,
          followerCount: Math.max(0, previous.followerCount - 1),
        });
      }
      return { previous };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artistKeys.profile(slug), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artistKeys.profile(slug) });
    },
  });
}

export function useFavoriteArtist(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artistId: string) => favoriteArtist(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistKeys.profile(slug) });
      const previous = queryClient.getQueryData<PublicArtistProfile>(artistKeys.profile(slug));
      if (previous) {
        queryClient.setQueryData<PublicArtistProfile>(artistKeys.profile(slug), {
          ...previous,
          viewerFavorited: true,
          favoriteCount: previous.favoriteCount + 1,
        });
      }
      return { previous };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artistKeys.profile(slug), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artistKeys.profile(slug) });
      queryClient.invalidateQueries({ queryKey: artistKeys.top() });
    },
  });
}

export function useUnfavoriteArtist(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (artistId: string) => unfavoriteArtist(artistId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistKeys.profile(slug) });
      const previous = queryClient.getQueryData<PublicArtistProfile>(artistKeys.profile(slug));
      if (previous) {
        queryClient.setQueryData<PublicArtistProfile>(artistKeys.profile(slug), {
          ...previous,
          viewerFavorited: false,
          favoriteCount: Math.max(0, previous.favoriteCount - 1),
        });
      }
      return { previous };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artistKeys.profile(slug), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artistKeys.profile(slug) });
      queryClient.invalidateQueries({ queryKey: artistKeys.top() });
    },
  });
}
