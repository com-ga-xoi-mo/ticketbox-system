import { getToken, clearToken } from '../auth/token-storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message: string = `Request failed: ${status}`,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const parseError = async (): Promise<ApiError> => {
    const text = await res.text().catch(() => '');
    try {
      const body = JSON.parse(text) as { code?: string; message?: string };
      return new ApiError(res.status, body.code, body.message || `Request failed: ${res.status}`);
    } catch {
      return new ApiError(res.status, undefined, text || `Request failed: ${res.status}`);
    }
  };
  if (res.status === 401) {
    clearToken();
    unauthorizedHandler?.();
    throw await parseError();
  }
  if (!res.ok) {
    throw await parseError();
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers = buildHeaders();
  // Remove explicit Content-Type to allow the browser to set it with the correct boundary
  delete headers['Content-Type'];
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<T>(res);
}

export function getAssetUrl(assetId: string): string {
  return `${BASE_URL}/assets/${assetId}`;
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export function resolveAvatarImageUrl(
  avatarAssetId: string | null | undefined,
  avatarUrl: string | null | undefined,
  externalAvatarUrl?: string | null,
): string | undefined {
  if (avatarUrl) return resolveImageUrl(avatarUrl);
  if (avatarAssetId) return getAssetUrl(avatarAssetId);
  if (externalAvatarUrl?.startsWith('https://')) return externalAvatarUrl;
  return undefined;
}
