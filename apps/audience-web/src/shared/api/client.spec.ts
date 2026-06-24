import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../auth/token-storage', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
}));

import { getToken, clearToken } from '../auth/token-storage';
import { apiGet, apiPost, registerUnauthorizedHandler } from './client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  };
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(clearToken).mockClear();
  mockFetch.mockClear();
});

describe('apiGet', () => {
  it('sends GET request to base URL + path', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { ok: true }));
    await apiGet('/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches Authorization header when token exists', async () => {
    vi.mocked(getToken).mockReturnValue('my-token');
    mockFetch.mockResolvedValue(mockResponse(200, {}));
    await apiGet('/protected');
    const [, options] = mockFetch.mock.calls[0];
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });

  it('does not attach Authorization header when no token', async () => {
    vi.mocked(getToken).mockReturnValue(null);
    mockFetch.mockResolvedValue(mockResponse(200, {}));
    await apiGet('/public');
    const [, options] = mockFetch.mock.calls[0];
    expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('clears token and calls unauthorized handler on 401', async () => {
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    mockFetch.mockResolvedValue(mockResponse(401, 'Unauthorized'));
    await expect(apiGet('/secure')).rejects.toThrow('Unauthorized');
    expect(clearToken).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  it('throws on non-ok responses', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, 'Server error'));
    await expect(apiGet('/fail')).rejects.toThrow();
  });
});

describe('apiPost', () => {
  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { created: true }));
    await apiPost('/resource', { name: 'test' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ name: 'test' }));
  });
});
