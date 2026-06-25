import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcertNotFoundError, ForbiddenConcertOwnershipError } from '../../domain/errors';
import type { ConcertOwnershipRepositoryPort } from '../../domain/ports/concert-ownership.port';
import { Role } from '../../domain/role.enum';
import { AuthorizeConcertManagementUseCase } from './authorize-concert-management.use-case';

describe('AuthorizeConcertManagementUseCase', () => {
  let ownershipRepo: ConcertOwnershipRepositoryPort;
  let useCase: AuthorizeConcertManagementUseCase;

  beforeEach(() => {
    ownershipRepo = {
      findOwnership: vi.fn(),
    };
    useCase = new AuthorizeConcertManagementUseCase(ownershipRepo);
  });

  it('allows organizer who owns the concert', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue({
      concertId: 'concert-1',
      ownerUserId: 'organizer-1',
    });

    await expect(
      useCase.execute({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('denies organizer who does not own the concert', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue({
      concertId: 'concert-1',
      ownerUserId: 'organizer-2',
    });

    await expect(
      useCase.execute({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(ForbiddenConcertOwnershipError);
  });

  it('allows admin override without ownership lookup when explicitly allowed', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        allowAdminOverride: true,
      }),
    ).resolves.toBeUndefined();

    expect(ownershipRepo.findOwnership).not.toHaveBeenCalled();
  });

  it('denies admin when override is not explicit', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(ForbiddenConcertOwnershipError);
  });

  it('throws not found when target concert does not exist', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue(null);

    await expect(
      useCase.execute({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'missing-concert',
      }),
    ).rejects.toThrow(ConcertNotFoundError);
  });
});
