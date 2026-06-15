import { describe, expect, it } from 'vitest';

import { ForbiddenAdminActionError } from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import { AuthorizeAdminActionUseCase } from './authorize-admin-action.use-case';

describe('AuthorizeAdminActionUseCase', () => {
  const useCase = new AuthorizeAdminActionUseCase();

  it('allows users with ADMIN role', () => {
    expect(() =>
      useCase.execute({ userId: 'admin-id', roles: [Role.ADMIN] }),
    ).not.toThrow();
  });

  it('denies users without ADMIN role', () => {
    expect(() =>
      useCase.execute({ userId: 'organizer-id', roles: [Role.ORGANIZER] }),
    ).toThrow(ForbiddenAdminActionError);
  });
});
