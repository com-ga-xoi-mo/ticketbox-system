import { describe, expect, it, vi } from 'vitest';

import {
  ASSIGNMENT_VISIBILITY_GRACE_HOURS,
  PrismaStaffAssignmentQueryAdapter,
} from './prisma-staff-assignment-query.adapter';

function makePrisma() {
  return {
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
}

describe('PrismaStaffAssignmentQueryAdapter', () => {
  it('projects current concert presentation fields', async () => {
    const prisma = makePrisma();

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
  });

  it('filters own active assignments to concerts not ended past the grace window', async () => {
    const prisma = makePrisma();
    const before = Date.now();

    await new PrismaStaffAssignmentQueryAdapter(prisma as never).listActiveByStaffId('jwt-staff');

    const arg = prisma.checkinStaffAssignment.findMany.mock.calls[0][0];
    expect(arg.where.staffId).toBe('jwt-staff');
    expect(arg.where.status).toBe('ACTIVE');

    // Concert must not have ended more than the grace window ago.
    const cutoff = (arg.where.concert.endsAt.gte as Date).getTime();
    const graceMs = ASSIGNMENT_VISIBILITY_GRACE_HOURS * 60 * 60 * 1000;
    expect(cutoff).toBeGreaterThanOrEqual(before - graceMs - 1000);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - graceMs + 1000);
  });

  it('orders results by concert start time ascending', async () => {
    const prisma = makePrisma();

    await new PrismaStaffAssignmentQueryAdapter(prisma as never).listActiveByStaffId('jwt-staff');

    const arg = prisma.checkinStaffAssignment.findMany.mock.calls[0][0];
    expect(arg.orderBy).toEqual({ concert: { startsAt: 'asc' } });
  });
});
