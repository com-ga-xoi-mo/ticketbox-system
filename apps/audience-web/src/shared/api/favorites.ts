import { apiGet, apiPost } from './client';

export interface FavoriteConcert {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  city: string;
  posterUrl: string | null;
  favoritedAt: string;
}

export async function getMyFavorites(): Promise<FavoriteConcert[]> {
  return apiGet<FavoriteConcert[]>('/me/favorites');
}

export async function toggleFavorite(concertId: string): Promise<{ isFavorited: boolean }> {
  return apiPost<{ isFavorited: boolean }>(`/me/favorites/${concertId}`, {});
}

export async function checkFavoriteStatus(concertId: string): Promise<{ isFavorited: boolean }> {
  return apiGet<{ isFavorited: boolean }>(`/me/favorites/${concertId}/status`);
}
