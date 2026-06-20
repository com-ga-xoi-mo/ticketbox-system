import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CheckinStaffUserNotFoundError,
  ForbiddenConcertOwnershipError,
  UserIsNotCheckinStaffError,
} from '../../domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../domain/ports/checkin-staff-assignment.port';
import type { ConcertOwnershipRepositoryPort } from '../../domain/ports/concert-ownership.port';
import { Role } from '../../domain/role.enum';
import { AuthorizeConcertManagementUseCase } from './authorize-concert-management.use-case';
import { ManageCheckinStaffAssignmentsUseCase } from './manage-checkin-staff-assignments.use-case';

describe('ManageCheckinStaffAssignmentsUseCase', () => {
  let assignmentRepo: CheckinStaffAssignmentRepositoryPort;
  let ownershipRepo: ConcertOwnershipRepositoryPort;
  let useCase: ManageCheckinStaffAssignmentsUseCase;

  beforeEach(() => {
    assignmentRepo = {
      findAssignmentById: vi.fn(),
      findActiveAssignment: vi.fn(),
      listActiveAssignments: vi.fn(),
      createActiveAssignment: vi.fn(),
      revokeAssignment: vi.fn(),
      userHasCheckinStaffRole: vi.fn(),
    };
    ownershipRepo = {
      findOwnership: vi.fn(),
    };
    useCase = new ManageCheckinStaffAssignmentsUseCase(
      assignmentRepo,
      new AuthorizeConcertManagementUseCase(ownershipRepo),
    );
  });

  it('allows organizer owner to assign check-in staff', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue({
      concertId: 'concert-1',
      ownerUserId: 'organizer-1',
    });
    vi.mocked(assignmentRepo.userHasCheckinStaffRole).mockResolvedValue(true);
    vi.mocked(assignmentRepo.createActiveAssignment).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      gateName: 'VIP',
      status: 'ACTIVE',
      assignedAt: new Date('2026-06-15T00:00:00.000Z'),
    });

    await expect(
      useCase.assign({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        staffUserId: 'staff-1',
        gateName: 'VIP',
      }),
    ).resolves.toMatchObject({ id: 'assignment-1', gateName: 'VIP' });
  });

  it('denies organizer who does not own the concert', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue({
      concertId: 'concert-1',
      ownerUserId: 'organizer-2',
    });

    await expect(
      useCase.assign({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        staffUserId: 'staff-1',
      }),
    ).rejects.toThrow(ForbiddenConcertOwnershipError);
  });

  it('allows admin to assign staff for any concert', async () => {
    vi.mocked(assignmentRepo.userHasCheckinStaffRole).mockResolvedValue(true);
    vi.mocked(assignmentRepo.createActiveAssignment).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      status: 'ACTIVE',
      assignedAt: new Date('2026-06-15T00:00:00.000Z'),
    });

    await expect(
      useCase.assign({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        staffUserId: 'staff-1',
      }),
    ).resolves.toMatchObject({ id: 'assignment-1' });

    expect(ownershipRepo.findOwnership).not.toHaveBeenCalled();
  });

  it('denies assignment when target user does not exist', async () => {
    vi.mocked(assignmentRepo.userHasCheckinStaffRole).mockResolvedValue(null);

    await expect(
      useCase.assign({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        staffUserId: 'missing-staff',
      }),
    ).rejects.toThrow(CheckinStaffUserNotFoundError);
  });

  it('denies assignment when target user is not check-in staff', async () => {
    vi.mocked(assignmentRepo.userHasCheckinStaffRole).mockResolvedValue(false);

    await expect(
      useCase.assign({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        staffUserId: 'audience-1',
      }),
    ).rejects.toThrow(UserIsNotCheckinStaffError);
  });

  it('allows organizer owner to revoke and list assignments', async () => {
    vi.mocked(ownershipRepo.findOwnership).mockResolvedValue({
      concertId: 'concert-1',
      ownerUserId: 'organizer-1',
    });
    vi.mocked(assignmentRepo.revokeAssignment).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      status: 'REVOKED',
      assignedAt: new Date('2026-06-15T00:00:00.000Z'),
      revokedAt: new Date('2026-06-15T01:00:00.000Z'),
    });
    vi.mocked(assignmentRepo.listActiveAssignments).mockResolvedValue([]);

    await expect(
      useCase.revoke({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        assignmentId: 'assignment-1',
      }),
    ).resolves.toMatchObject({ status: 'REVOKED' });

    expect(assignmentRepo.revokeAssignment).toHaveBeenCalledWith({
      assignmentId: 'assignment-1',
      concertId: 'concert-1',
    });

    await expect(
      useCase.listActive({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
      }),
    ).resolves.toEqual([]);
  });
});
