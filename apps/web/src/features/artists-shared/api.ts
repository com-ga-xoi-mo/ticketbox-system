import { get } from '../../shared/api/client';
import type { PublicArtistListResponse } from '@ticketbox/api-types';

export const PUBLIC_ARTISTS_PATH = '/public/artists';

export async function searchActiveArtists(params: Record<string, string | number>): Promise<PublicArtistListResponse> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return get<PublicArtistListResponse>(`${PUBLIC_ARTISTS_PATH}?${qs}`);
}
