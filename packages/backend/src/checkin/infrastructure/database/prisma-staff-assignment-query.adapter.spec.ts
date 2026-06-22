import { describe, expect, it, vi } from 'vitest';

import { PrismaStaffAssignmentQueryAdapter } from './prisma-staff-assignment-query.adapter';

describe('PrismaStaffAssignmentQueryAdapter', () => {
  it('filters own active assignments and projects current concert presentation fields', async () => {
    const prisma = {
      checkinStaffAssignment: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'assignment-id',
            concertId: 'concert-id',
            gateName: 'Main Gate',
            status: 'ACTIVE',
            concert: { title: 'TicketBox Live', startsAt: new Date('2026-07-01T12:00:00.000Z') },
          },
        ]),
      },
    };

    await expect(
      new PrismaStaffAssignmentQueryAdapter(prisma as never).listActiveByStaffId('jwt-staff'),
    ).resolves.toEqual([
      {
        assignmentId: 'assignment-id',
        concertId: 'concert-id',
        concertTitle: 'TicketBox Live',
        gate: 'Main Gate',
        startsAt: new Date('2026-07-01T12:00:00.000Z'),
        status: 'ACTIVE',
      },
    ]);
    expect(prisma.checkinStaffAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { staffId: 'jwt-staff', status: 'ACTIVE' } }),
    );
  });
});
