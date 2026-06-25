import { apiGet, apiPost, apiDelete } from './client';
import type {
  PublicArtistListResponse,
  PublicArtistProfile,
  TopArtistListResponse,
  ArtistFollowResponse,
  ArtistFavoriteResponse,
} from '@ticketbox/api-types';

export function fetchArtists(params?: { q?: string; limit?: number; offset?: number }): Promise<PublicArtistListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  
  const queryString = query.toString();
  const path = queryString ? `/public/artists?${queryString}` : '/public/artists';
  return apiGet<PublicArtistListResponse>(path);
}

export function fetchArtistProfile(slug: string): Promise<PublicArtistProfile> {
  return apiGet<PublicArtistProfile>(`/public/artists/${encodeURIComponent(slug)}`);
}

export function fetchTopArtists(): Promise<TopArtistListResponse> {
  return apiGet<TopArtistListResponse>('/public/artists/top');
}

export function followArtist(artistId: string): Promise<ArtistFollowResponse> {
  return apiPost<ArtistFollowResponse>(`/audience/artists/${encodeURIComponent(artistId)}/follow`, {});
}

export function unfollowArtist(artistId: string): Promise<ArtistFollowResponse> {
  return apiDelete<ArtistFollowResponse>(`/audience/artists/${encodeURIComponent(artistId)}/follow`);
}

export function favoriteArtist(artistId: string): Promise<ArtistFavoriteResponse> {
  return apiPost<ArtistFavoriteResponse>(`/audience/artists/${encodeURIComponent(artistId)}/favorite`, {});
}

export function unfavoriteArtist(artistId: string): Promise<ArtistFavoriteResponse> {
  return apiDelete<ArtistFavoriteResponse>(`/audience/artists/${encodeURIComponent(artistId)}/favorite`);
}
