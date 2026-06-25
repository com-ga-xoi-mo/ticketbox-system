import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '../../../domain/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: vi.fn(() => ({ user })),
    })),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows organizer-admin route role checks to pass for ORGANIZER', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ORGANIZER, Role.ADMIN]);

    expect(guard.canActivate(makeContext({ id: 'organizer-1', roles: [Role.ORGANIZER] }))).toBe(
      true,
    );
  });

  it('allows platform-admin route role checks for ADMIN', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(makeContext({ id: 'admin-1', roles: [Role.ADMIN] }))).toBe(true);
  });

  it('denies non-admin users on platform-admin routes with 403', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(makeContext({ id: 'organizer-1', roles: [Role.ORGANIZER] })),
    ).toThrow(ForbiddenException);
  });

  it('denies non-staff users on check-in routes with 403 before assignment checks', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.CHECKIN_STAFF]);

    expect(() =>
      guard.canActivate(makeContext({ id: 'audience-1', roles: [Role.AUDIENCE] })),
    ).toThrow(ForbiddenException);
  });

  it('stores role metadata under the shared roles key', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
