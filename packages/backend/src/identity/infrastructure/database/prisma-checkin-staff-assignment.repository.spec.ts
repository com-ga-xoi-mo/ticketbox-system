import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CheckinAssignmentNotFoundError,
  DuplicateCheckinAssignmentError,
} from '../../domain/errors';
import { PrismaCheckinStaffAssignmentRepository } from './prisma-checkin-staff-assignment.repository';

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-1',
    staffId: 'staff-1',
    concertId: 'concert-1',
    gateName: null,
    status: 'ACTIVE',
    assignedAt: new Date('2026-06-15T00:00:00.000Z'),
    revokedAt: null,
    ...overrides,
  };
}

describe('PrismaCheckinStaffAssignmentRepository', () => {
  let prisma: {
    checkinStaffAssignment: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaCheckinStaffAssignmentRepository;

  beforeEach(() => {
    prisma = {
      checkinStaffAssignment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    repository = new PrismaCheckinStaffAssignmentRepository(prisma as never);
  });

  it('returns active concert-wide assignment when no gate is required', async () => {
    prisma.checkinStaffAssignment.findMany.mockResolvedValue([makeAssignment()]);

    await expect(
      repository.findActiveAssignment({
        staffUserId: 'staff-1',
        concertId: 'concert-1',
      }),
    ).resolves.toMatchObject({
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      status: 'ACTIVE',
    });
  });

  it('prefers exact gate assignment when a gate is required', async () => {
    prisma.checkinStaffAssignment.findMany.mockResolvedValue([
      makeAssignment({ id: 'assignment-a', gateName: 'Gate A' }),
      makeAssignment({ id: 'assignment-b', gateName: 'Gate B' }),
    ]);

    await expect(
      repository.findActiveAssignment({
        staffUserId: 'staff-1',
        concertId: 'concert-1',
        gateName: 'Gate B',
      }),
    ).resolves.toMatchObject({ id: 'assignment-b', gateName: 'Gate B' });
  });

  it('rejects duplicate active assignments before create', async () => {
    prisma.checkinStaffAssignment.findFirst.mockResolvedValue(makeAssignment());

    await expect(
      repository.createActiveAssignment({
        staffUserId: 'staff-1',
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(DuplicateCheckinAssignmentError);
  });

  it('maps Prisma unique constraint errors to duplicate assignment errors', async () => {
    prisma.checkinStaffAssignment.findFirst.mockResolvedValue(null);
    prisma.checkinStaffAssignment.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      repository.createActiveAssignment({
        staffUserId: 'staff-1',
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(DuplicateCheckinAssignmentError);
  });

  it('revokes active assignment', async () => {
    prisma.checkinStaffAssignment.findFirst.mockResolvedValue(makeAssignment());
    prisma.checkinStaffAssignment.update.mockResolvedValue(
      makeAssignment({
        status: 'REVOKED',
        revokedAt: new Date('2026-06-15T01:00:00.000Z'),
      }),
    );

    await expect(
      repository.revokeAssignment({
        assignmentId: 'assignment-1',
        concertId: 'concert-1',
      }),
    ).resolves.toMatchObject({ status: 'REVOKED' });

    expect(prisma.checkinStaffAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'assignment-1',
        concertId: 'concert-1',
      },
    });
  });

  it('throws when revoking an unknown or cross-concert assignment', async () => {
    prisma.checkinStaffAssignment.findFirst.mockResolvedValue(null);

    await expect(
      repository.revokeAssignment({
        assignmentId: 'assignment-from-other-concert',
        concertId: 'concert-1',
      }),
    ).rejects.toThrow(CheckinAssignmentNotFoundError);
  });

  it('checks whether a user has CHECKIN_STAFF role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      roles: [{ role: { code: 'CHECKIN_STAFF' } }],
    });

    await expect(repository.userHasCheckinStaffRole('staff-1')).resolves.toBe(true);
  });
});
