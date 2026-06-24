import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};

vi.stubGlobal('localStorage', localStorageMock);

import { getToken, setToken, clearToken } from './token-storage';

describe('token-storage', () => {
  beforeEach(() => localStorageMock.clear());

  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setToken('test-token');
    expect(getToken()).toBe('test-token');
  });

  it('clears stored token', () => {
    setToken('test-token');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('uses audience-specific storage key separate from organizer app', () => {
    setToken('audience-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ticketbox_audience_token', 'audience-token');
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('ticketbox_access_token', expect.any(String));
  });
});
