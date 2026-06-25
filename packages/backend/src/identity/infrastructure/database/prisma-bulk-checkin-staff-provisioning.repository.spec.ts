import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaBulkCheckinStaffProvisioningRepository } from './prisma-bulk-checkin-staff-provisioning.repository';

describe('PrismaBulkCheckinStaffProvisioningRepository', () => {
  let tx: {
    role: { findUnique: ReturnType<typeof vi.fn> };
    user: { create: ReturnType<typeof vi.fn> };
    checkinStaffAssignment: { create: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    concert: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let repository: PrismaBulkCheckinStaffProvisioningRepository;

  beforeEach(() => {
    tx = {
      role: { findUnique: vi.fn() },
      user: { create: vi.fn() },
      checkinStaffAssignment: { create: vi.fn() },
    };
    prisma = {
      concert: { findUnique: vi.fn() },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    repository = new PrismaBulkCheckinStaffProvisioningRepository(prisma as never);
  });

  it('finds concert summary for credential handoff', async () => {
    prisma.concert.findUnique.mockResolvedValue({ id: 'concert-1', title: 'Summer Live' });

    await expect(repository.findConcertSummary('concert-1')).resolves.toEqual({
      id: 'concert-1',
      title: 'Summer Live',
    });

    expect(prisma.concert.findUnique).toHaveBeenCalledWith({
      where: { id: 'concert-1' },
      select: { id: true, title: true },
    });
  });

  it('creates users with CHECKIN_STAFF role and concert-wide assignments in one transaction', async () => {
    tx.role.findUnique.mockResolvedValue({ id: 'role-checkin' });
    tx.user.create
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'abc@gmail.com',
        displayName: 'Gate Staff 1',
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'abc1@gmail.com',
        displayName: 'Gate Staff 2',
        status: 'ACTIVE',
      });
    tx.checkinStaffAssignment.create
      .mockResolvedValueOnce({ id: 'assignment-1' })
      .mockResolvedValueOnce({ id: 'assignment-2' });

    await expect(
      repository.createAccountsAndAssignments({
        concertId: 'concert-1',
        accounts: [
          {
            email: 'abc@gmail.com',
            displayName: 'Gate Staff 1',
            passwordHash: 'hash-1',
          },
          {
            email: 'abc1@gmail.com',
            displayName: 'Gate Staff 2',
            passwordHash: 'hash-2',
          },
        ],
      }),
    ).resolves.toEqual([
      {
        userId: 'user-1',
        email: 'abc@gmail.com',
        displayName: 'Gate Staff 1',
        status: 'ACTIVE',
        assignmentId: 'assignment-1',
      },
      {
        userId: 'user-2',
        email: 'abc1@gmail.com',
        displayName: 'Gate Staff 2',
        status: 'ACTIVE',
        assignmentId: 'assignment-2',
      },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { code: 'CHECKIN_STAFF' },
      select: { id: true },
    });
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'abc@gmail.com',
          passwordHash: 'hash-1',
          roles: { create: [{ roleId: 'role-checkin' }] },
        }),
      }),
    );
    expect(tx.checkinStaffAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          staffId: 'user-1',
          concertId: 'concert-1',
          gateName: null,
          status: 'ACTIVE',
        },
      }),
    );
  });
});
