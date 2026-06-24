import { describe, it, expect } from 'vitest';
import { decodeJwt } from './jwt-decode';

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwt', () => {
  it('returns null for null input', () => {
    expect(decodeJwt(null)).toBeNull();
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('a.b')).toBeNull();
    expect(decodeJwt('a.!!invalid!!.c')).toBeNull();
  });

  it('decodes a valid audience token', () => {
    const token = makeJwt({ sub: 'user-123', roles: ['AUDIENCE'] });
    expect(decodeJwt(token)).toEqual({ sub: 'user-123', roles: ['AUDIENCE'] });
  });

  it('returns null if sub is missing', () => {
    const token = makeJwt({ roles: ['AUDIENCE'] });
    expect(decodeJwt(token)).toBeNull();
  });

  it('returns null if roles is missing', () => {
    const token = makeJwt({ sub: 'user-123' });
    expect(decodeJwt(token)).toBeNull();
  });
});
