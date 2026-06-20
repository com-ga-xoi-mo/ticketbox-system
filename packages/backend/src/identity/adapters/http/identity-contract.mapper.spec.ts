import { LoginResponseSchema, StaffProfileResponseSchema } from '@ticketbox/api-types';
import { describe, expect, it } from 'vitest';

import { Role } from '../../domain/role.enum';
import { toLoginResponse, toStaffProfileResponse } from './identity-contract.mapper';

describe('identity HTTP contract mappers', () => {
  it('preserves token-only login', () => {
    expect(LoginResponseSchema.parse(toLoginResponse({ accessToken: 'jwt' }))).toEqual({
      accessToken: 'jwt',
    });
  });

  it('uses JWT id/roles and persistence display fields without reloading roles', () => {
    const response = toStaffProfileResponse(
      {
        id: '11111111-1111-4111-8111-111111111111',
        roles: [Role.CHECKIN_STAFF],
      },
      { email: 'staff@ticketbox.test', displayName: 'Gate Staff' },
    );

    expect(StaffProfileResponseSchema.parse(response)).toEqual(response);
    expect(response.roles).toEqual(['CHECKIN_STAFF']);
  });
});
