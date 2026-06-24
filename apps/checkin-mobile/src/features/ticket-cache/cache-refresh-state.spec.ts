import { describe, expect, it } from 'vitest';

import { shouldRefreshCache } from './cache-refresh-state';

const base = { onScanner: true, authenticated: true, online: true, downloading: false };

describe('shouldRefreshCache', () => {
  it('refreshes when on scanner, authenticated, online, and idle', () => {
    expect(shouldRefreshCache(base)).toBe(true);
  });

  it('does not refresh when off the scanner', () => {
    expect(shouldRefreshCache({ ...base, onScanner: false })).toBe(false);
  });

  it('does not refresh when unauthenticated', () => {
    expect(shouldRefreshCache({ ...base, authenticated: false })).toBe(false);
  });

  it('does not refresh when offline', () => {
    expect(shouldRefreshCache({ ...base, online: false })).toBe(false);
  });

  it('does not refresh while a download is already in progress', () => {
    expect(shouldRefreshCache({ ...base, downloading: true })).toBe(false);
  });
});
