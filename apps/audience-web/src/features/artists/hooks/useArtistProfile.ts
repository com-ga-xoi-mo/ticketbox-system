import { useQuery } from '@tanstack/react-query';
import { fetchArtistProfile } from '../../../shared/api/artists';
import { artistKeys } from './keys';

export function useArtistProfile(slug: string) {
  return useQuery({
    queryKey: artistKeys.profile(slug),
    queryFn: () => fetchArtistProfile(slug),
    enabled: Boolean(slug),
  });
}
