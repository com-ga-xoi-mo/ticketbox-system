import { get, post, patch } from '../../shared/api/client';
import type { Concert } from './types';

export async function listConcerts(basePath: string): Promise<Concert[]> {
  return get<Concert[]>(basePath);
}

export async function getConcert(basePath: string, id: string): Promise<Concert> {
  return get<Concert>(`${basePath}/${id}`);
}

export async function createConcert(basePath: string, payload: unknown): Promise<Concert> {
  return post<Concert>(basePath, payload);
}

export async function updateConcert(
  basePath: string,
  id: string,
  payload: unknown,
): Promise<Concert> {
  return patch<Concert>(`${basePath}/${id}`, payload);
}

export async function publishConcert(basePath: string, id: string): Promise<Concert> {
  return post<Concert>(`${basePath}/${id}/publish`, {});
}

export async function cancelConcert(basePath: string, id: string): Promise<Concert> {
  return post<Concert>(`${basePath}/${id}/cancel`, {});
}
