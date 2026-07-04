import { get, post, patch, put, postFormData } from '../../../shared/api/client';
import type { ManagementConcertResponse } from '@ticketbox/api-types';

export const ADMIN_CONCERTS_PATH = '/admin/concerts';

export async function listConcerts(): Promise<ManagementConcertResponse[]> {
  return get<ManagementConcertResponse[]>(ADMIN_CONCERTS_PATH);
}

export async function getConcert(id: string): Promise<ManagementConcertResponse> {
  return get<ManagementConcertResponse>(`${ADMIN_CONCERTS_PATH}/${id}`);
}

export async function createConcert(payload: unknown): Promise<ManagementConcertResponse> {
  return post<ManagementConcertResponse>(ADMIN_CONCERTS_PATH, payload);
}

export async function updateConcert(
  id: string,
  payload: unknown,
): Promise<ManagementConcertResponse> {
  return patch<ManagementConcertResponse>(`${ADMIN_CONCERTS_PATH}/${id}`, payload);
}

export async function publishConcert(id: string): Promise<ManagementConcertResponse> {
  return post<ManagementConcertResponse>(`${ADMIN_CONCERTS_PATH}/${id}/publish`, {});
}

export async function cancelConcert(id: string): Promise<ManagementConcertResponse> {
  return post<ManagementConcertResponse>(`${ADMIN_CONCERTS_PATH}/${id}/cancel`, {});
}

export async function uploadPoster(id: string, file: File): Promise<{ asset: { publicUrl: string; id: string } }> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<{ asset: { publicUrl: string; id: string } }>(`${ADMIN_CONCERTS_PATH}/${id}/poster`, formData);
}

export async function uploadBanner(id: string, file: File): Promise<{ asset: { publicUrl: string; id: string } }> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<{ asset: { publicUrl: string; id: string } }>(`${ADMIN_CONCERTS_PATH}/${id}/banner`, formData);
}

export async function replaceArtists(id: string, payload: unknown): Promise<void> {
  return put<{ success: boolean }>(`${ADMIN_CONCERTS_PATH}/${id}/artists`, payload).then(() => {});
}
