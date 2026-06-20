import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { Role } from '../../domain/role.enum';
import { RolesGuard } from './guards/roles.guard';
import { AdminCheckinStaffAssignmentsController } from './admin-checkin-staff-assignments.controller';
import { ROLES_KEY } from './decorators/roles.decorator';

describe('AdminCheckinStaffAssignmentsController route protection', () => {
  it('uses JwtAuthGuard before RolesGuard so unauthenticated requests fail before role checks', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminCheckinStaffAssignmentsController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('allows ORGANIZER and ADMIN coarse roles for organizer-admin staff routes', () => {
    const roles = new Reflector().get<Role[]>(ROLES_KEY, AdminCheckinStaffAssignmentsController);

    expect(roles).toEqual([Role.ORGANIZER, Role.ADMIN]);
  });
});
