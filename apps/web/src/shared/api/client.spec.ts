import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shim localStorage before importing the module
const store: Record<string, string> = {};
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = v;
  },
  removeItem: (k) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  length: 0,
  key: () => null,
};

// Import after shim
const { post, get, patch, registerUnauthorizedHandler } = await import('./client');
const { setToken } = await import('../auth/token-storage');

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

describe('api client', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('attaches Authorization: Bearer when token present', async () => {
    setToken('my.jwt.token');
    mockFetch(200, { ok: true });
    await get('/test');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['Authorization']).toBe('Bearer my.jwt.token');
  });

  it('sends no Authorization header without token', async () => {
    mockFetch(200, { ok: true });
    await get('/test');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers['Authorization']).toBeUndefined();
  });

  it('on 401: clears token and calls unauthorized handler', async () => {
    setToken('expired.token');
    mockFetch(401, { message: 'Unauthorized' });
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);

    await expect(get('/protected')).rejects.toThrow('Unauthorized');
    expect(localStorage.getItem('ticketbox_access_token')).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('post sends JSON body', async () => {
    mockFetch(200, { accessToken: 'tok' });
    await post('/auth/login', { email: 'a@b.com', password: 'pw' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].body).toBe(JSON.stringify({ email: 'a@b.com', password: 'pw' }));
  });

  it('patch sends JSON body and PATCH method', async () => {
    mockFetch(200, { ok: true });
    await patch('/test', { foo: 'bar' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].method).toBe('PATCH');
    expect(call[1].body).toBe(JSON.stringify({ foo: 'bar' }));
  });
});
