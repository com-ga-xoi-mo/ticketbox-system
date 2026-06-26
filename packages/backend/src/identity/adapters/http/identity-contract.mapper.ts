import type { LoginResponse, RoleCode, StaffProfileResponse, MyProfileResponse, Gender } from '@ticketbox/api-types';

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
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
    gender: profile.gender as Gender | null,
    addressLine: profile.addressLine,
    city: profile.city,
    district: profile.district,
    avatarAssetId: profile.avatarAssetId,
    avatarUrl: profile.avatarUrl,
  };
}

export function toMyProfileResponse(
  principal: AuthenticatedUser,
  profile: ProfileProjection,
): MyProfileResponse {
  return toStaffProfileResponse(principal, profile);
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
