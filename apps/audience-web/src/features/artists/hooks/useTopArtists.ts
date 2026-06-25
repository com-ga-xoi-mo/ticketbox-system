import { useQuery } from '@tanstack/react-query';
import { fetchTopArtists } from '../../../shared/api/artists';
import { artistKeys } from './keys';

export function useTopArtists() {
  return useQuery({
    queryKey: artistKeys.top(),
    queryFn: fetchTopArtists,
  });
}
