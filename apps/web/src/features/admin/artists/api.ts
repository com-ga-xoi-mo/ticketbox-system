import { get, post, patch, postFormData } from '../../../shared/api/client';
import type { ManagementArtistResponse, AdminArtistListResponse } from '@ticketbox/api-types';

export const ADMIN_ARTISTS_PATH = '/admin/artists';

export async function listArtists(params: Record<string, string | number>): Promise<AdminArtistListResponse> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return get<AdminArtistListResponse>(`${ADMIN_ARTISTS_PATH}?${qs}`);
}

export async function createArtist(payload: unknown): Promise<ManagementArtistResponse> {
  return post<ManagementArtistResponse>(ADMIN_ARTISTS_PATH, payload);
}

export async function updateArtist(id: string, payload: unknown): Promise<ManagementArtistResponse> {
  return patch<ManagementArtistResponse>(`${ADMIN_ARTISTS_PATH}/${id}`, payload);
}

export async function uploadArtistAvatar(id: string, file: File): Promise<{ publicUrl: string; assetId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<{ publicUrl: string; assetId: string }>(`${ADMIN_ARTISTS_PATH}/${id}/avatar`, formData);
}

export async function uploadArtistPoster(id: string, file: File): Promise<{ publicUrl: string; assetId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<{ publicUrl: string; assetId: string }>(`${ADMIN_ARTISTS_PATH}/${id}/poster`, formData);
}
