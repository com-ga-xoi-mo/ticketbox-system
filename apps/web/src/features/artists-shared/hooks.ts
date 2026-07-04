import { useQuery } from '@tanstack/react-query';
import { searchActiveArtists } from './api';
import { PublicArtistListResponseSchema } from '@ticketbox/api-types';

export const artistSharedKeys = {
  all: ['public-artists'] as const,
  lists: () => [...artistSharedKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) => [...artistSharedKeys.lists(), filters] as const,
};

export function useActiveArtists(filters: Record<string, string | number>, enabled = true) {
  return useQuery({
    queryKey: artistSharedKeys.list(filters),
    queryFn: async () => {
      const data = await searchActiveArtists(filters);
      return PublicArtistListResponseSchema.parse(data);
    },
    enabled,
  });
}
