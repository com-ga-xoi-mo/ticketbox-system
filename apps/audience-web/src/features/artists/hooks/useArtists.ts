import { useQuery } from '@tanstack/react-query';
import { fetchArtists } from '../../../shared/api/artists';
import { artistKeys } from './keys';

export function useArtists(params: { q?: string; page?: number } = {}) {
  const { q, page = 1 } = params;
  const limit = 20;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: artistKeys.list(params),
    queryFn: () => fetchArtists({ q, limit, offset }),
    placeholderData: (previousData) => previousData,
  });
}
