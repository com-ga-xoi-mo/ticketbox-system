import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, clearToken } from './token-storage';

// Minimal localStorage shim for node environment
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

describe('token-storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('round-trips set/get', () => {
    setToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
  });

  it('clears the token', () => {
    setToken('xyz');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
