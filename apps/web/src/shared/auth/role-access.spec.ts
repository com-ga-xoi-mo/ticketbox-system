import { describe, it, expect } from 'vitest';
import { canAccess, redirectFor } from './role-access';
import type { Session } from './AuthContext';

function session(roles: string[]): Session {
  return { sub: 'u', roles: roles as Session['roles'] };
}

describe('canAccess', () => {
  it('returns false for null session', () => {
    expect(canAccess(null, ['ORGANIZER'])).toBe(false);
  });

  it('returns true when session has an allowed role', () => {
    expect(canAccess(session(['ORGANIZER']), ['ORGANIZER', 'ADMIN'])).toBe(true);
  });

  it('returns false when session has none of the allowed roles', () => {
    expect(canAccess(session(['AUDIENCE']), ['ORGANIZER', 'ADMIN'])).toBe(false);
  });
});

describe('redirectFor', () => {
  it('ADMIN → /admin/dashboard', () => {
    expect(redirectFor(session(['ADMIN']))).toBe('/admin/dashboard');
  });

  it('ORGANIZER → /organizer/dashboard', () => {
    expect(redirectFor(session(['ORGANIZER']))).toBe('/organizer/dashboard');
  });

  it('ADMIN + ORGANIZER → /admin/dashboard (ADMIN takes precedence)', () => {
    expect(redirectFor(session(['ORGANIZER', 'ADMIN']))).toBe('/admin/dashboard');
  });

  it('CHECKIN_STAFF → /no-access', () => {
    expect(redirectFor(session(['CHECKIN_STAFF']))).toBe('/no-access');
  });

  it('AUDIENCE → /no-access', () => {
    expect(redirectFor(session(['AUDIENCE']))).toBe('/no-access');
  });

  it('empty roles → /no-access', () => {
    expect(redirectFor(session([]))).toBe('/no-access');
  });

  it('null session → /login', () => {
    expect(redirectFor(null)).toBe('/login');
  });
});
