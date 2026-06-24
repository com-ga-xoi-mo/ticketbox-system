import { get, post, patch, postFormData } from '../../../shared/api/client';
import type { Concert } from '../../concerts-shared/types';

export const ADMIN_CONCERTS_PATH = '/admin/concerts';

export async function listConcerts(): Promise<Concert[]> {
  return get<Concert[]>(ADMIN_CONCERTS_PATH);
}

export async function getConcert(id: string): Promise<Concert> {
  return get<Concert>(`${ADMIN_CONCERTS_PATH}/${id}`);
}

export async function createConcert(payload: unknown): Promise<Concert> {
  return post<Concert>(ADMIN_CONCERTS_PATH, payload);
}

export async function updateConcert(
  id: string,
  payload: unknown,
): Promise<Concert> {
  return patch<Concert>(`${ADMIN_CONCERTS_PATH}/${id}`, payload);
}

export async function publishConcert(id: string): Promise<Concert> {
  return post<Concert>(`${ADMIN_CONCERTS_PATH}/${id}/publish`, {});
}

export async function cancelConcert(id: string): Promise<Concert> {
  return post<Concert>(`${ADMIN_CONCERTS_PATH}/${id}/cancel`, {});
}

export async function uploadPoster(id: string, file: File): Promise<{ asset: { publicUrl: string; id: string } }> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<{ asset: { publicUrl: string; id: string } }>(`${ADMIN_CONCERTS_PATH}/${id}/poster`, formData);
}
