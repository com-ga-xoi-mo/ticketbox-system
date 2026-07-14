import { getToken, clearToken } from '../auth/token-storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function extractError(
  body: string,
  status: number,
): { message: string; code?: string; body: unknown } {
  let parsedBody: unknown = null;
  let resolvedCode: string | undefined;
  try {
    parsedBody = JSON.parse(body) as unknown;
    if (parsedBody && typeof parsedBody === 'object') {
      const { message, code } = parsedBody as { message?: unknown; code?: unknown };
      resolvedCode = typeof code === 'string' && code ? code : undefined;
      if (Array.isArray(message)) {
        return { message: message.join('; '), code: resolvedCode, body: parsedBody };
      }
      if (typeof message === 'string' && message) {
        return { message, code: resolvedCode, body: parsedBody };
      }
    }
  } catch {
    // Non-JSON body: never surface it raw, fall through to a generic message.
  }
  if (status === 403) {
    return {
      message: 'You do not have permission to perform this action.',
      code: resolvedCode,
      body: parsedBody,
    };
  }
  if (status === 404) {
    return {
      message: 'The requested resource was not found.',
      code: resolvedCode,
      body: parsedBody,
    };
  }
  if (status === 409)
    return {
      message: 'This conflicts with existing data. Please adjust and retry.',
      code: resolvedCode,
      body: parsedBody,
    };
  return { message: `Request failed: ${status}`, code: resolvedCode, body: parsedBody };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    unauthorizedHandler?.();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const error = extractError(body, res.status);
    throw new ApiError(error.message, res.status, error.code, error.body);
  }
  return res.json() as Promise<T>;
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers = buildHeaders() as Record<string, string>;
  delete headers['Content-Type']; // Let browser set Content-Type with boundary

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

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

export function resolveAvatarImageUrl(
  avatarAssetId: string | null | undefined,
  avatarUrl: string | null | undefined,
): string | undefined {
  if (avatarUrl) return resolveImageUrl(avatarUrl);
  if (avatarAssetId) return getAssetUrl(avatarAssetId);
  return undefined;
}
