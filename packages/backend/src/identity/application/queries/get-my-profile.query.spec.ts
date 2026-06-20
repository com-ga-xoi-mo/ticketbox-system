import { describe, expect, it, vi } from 'vitest';

import type { ProfileQueryPort } from '../ports/profile-query.port';
import { GetMyProfileQuery } from './get-my-profile.query';

describe('GetMyProfileQuery', () => {
  it('loads only the safe profile projection for the authenticated id', async () => {
    const port: ProfileQueryPort = {
      findByUserId: vi.fn().mockResolvedValue({ email: 'staff@test', displayName: 'Staff' }),
    };
    await expect(new GetMyProfileQuery(port).execute('jwt-user-id')).resolves.toEqual({
      email: 'staff@test',
      displayName: 'Staff',
    });
    expect(port.findByUserId).toHaveBeenCalledWith('jwt-user-id');
  });
});
