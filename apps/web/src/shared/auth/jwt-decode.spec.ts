import { describe, it, expect } from 'vitest';
import { decodeJwt } from './jwt-decode';

function makeToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

describe('jwt-decode', () => {
  it('extracts sub and roles from a valid token', () => {
    const token = makeToken({ sub: 'user-1', roles: ['ORGANIZER'] });
    const result = decodeJwt(token);
    expect(result).toEqual({ sub: 'user-1', roles: ['ORGANIZER'] });
  });

  it('returns null for null input', () => {
    expect(decodeJwt(null)).toBeNull();
  });

  it('returns null for garbage string', () => {
    expect(decodeJwt('not.a.token')).toBeNull();
  });

  it('returns null when sub is missing', () => {
    const token = makeToken({ roles: ['ADMIN'] });
    expect(decodeJwt(token)).toBeNull();
  });

  it('returns null when roles is not an array', () => {
    const token = makeToken({ sub: 'u', roles: 'ADMIN' });
    expect(decodeJwt(token)).toBeNull();
  });

  it('does not throw on completely invalid input', () => {
    expect(() => decodeJwt('!!!')).not.toThrow();
  });
});
