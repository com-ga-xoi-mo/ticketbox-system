import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
  MissingCheckinStaffRoleError,
} from '../../domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../domain/ports/checkin-staff-assignment.port';
import { Role } from '../../domain/role.enum';
import { AuthorizeCheckinAssignmentUseCase } from './authorize-checkin-assignment.use-case';

describe('AuthorizeCheckinAssignmentUseCase', () => {
  let assignmentRepo: CheckinStaffAssignmentRepositoryPort;
  let useCase: AuthorizeCheckinAssignmentUseCase;

  beforeEach(() => {
    assignmentRepo = {
      findAssignmentById: vi.fn(),
      findActiveAssignment: vi.fn(),
      listActiveAssignments: vi.fn(),
      createActiveAssignment: vi.fn(),
      revokeAssignment: vi.fn(),
      revokeAllForStaffUser: vi.fn(),
      userHasCheckinStaffRole: vi.fn(),
    };
    useCase = new AuthorizeCheckinAssignmentUseCase(assignmentRepo);
  });

  it('allows assigned check-in staff', async () => {
    vi.mocked(assignmentRepo.findActiveAssignment).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      status: 'ACTIVE',
      assignedAt: new Date('2026-06-15T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({
        actor: { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] },
        concertId: 'concert-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('denies users without CHECKIN_STAFF role before assignment lookup', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'audience-1', roles: [Role.AUDIENCE] },
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(MissingCheckinStaffRoleError);

    expect(assignmentRepo.findActiveAssignment).not.toHaveBeenCalled();
  });

  it('denies unassigned staff', async () => {
    vi.mocked(assignmentRepo.findActiveAssignment).mockResolvedValue(null);

    await expect(
      useCase.execute({
        actor: { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] },
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(MissingActiveCheckinAssignmentError);
  });

  it('denies staff assigned to a different required gate', async () => {
    vi.mocked(assignmentRepo.findActiveAssignment).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      gateName: 'Gate A',
      status: 'ACTIVE',
      assignedAt: new Date('2026-06-15T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({
        actor: { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] },
        concertId: 'concert-1',
        gateName: 'Gate B',
      }),
    ).rejects.toThrow(CheckinGateMismatchError);
  });
});
