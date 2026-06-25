import type { LoginResponse, RoleCode, StaffProfileResponse } from '@ticketbox/api-types';

import type { ProfileProjection } from '../../application/ports/profile-query.port';
import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import { Role } from '../../domain/role.enum';
import type { AuthTokenResponse } from '../../application/use-cases/register.use-case';

export function toLoginResponse(result: AuthTokenResponse): LoginResponse {
  return { accessToken: result.accessToken };
}

export function toStaffProfileResponse(
  principal: AuthenticatedUser,
  profile: ProfileProjection,
): StaffProfileResponse {
  return {
    id: principal.id,
    email: profile.email,
    displayName: profile.displayName,
    roles: principal.roles.map(toRoleCode),
  };
}

function toRoleCode(role: Role): RoleCode {
  switch (role) {
    case Role.AUDIENCE:
    case Role.ORGANIZER:
    case Role.CHECKIN_STAFF:
    case Role.ADMIN:
      return role;
  }
}
