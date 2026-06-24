import { Injectable } from '@nestjs/common';

import type {
  StaffAssignmentQueryPort,
  StaffAssignmentReadModel,
} from '../../application/ports/staff-assignment-query.port';
import { PrismaService } from '../../../platform/database/prisma.service';

/**
 * Assignments stay listed for this many hours after the concert's `endsAt` so late
 * check-in can continue; past this grace they drop out of the active list even though the
 * stored row remains `ACTIVE` (no auto-revocation).
 */
export const ASSIGNMENT_VISIBILITY_GRACE_HOURS = 6;

@Injectable()
export class PrismaStaffAssignmentQueryAdapter implements StaffAssignmentQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveByStaffId(staffId: string): Promise<StaffAssignmentReadModel[]> {
    const cutoff = new Date(Date.now() - ASSIGNMENT_VISIBILITY_GRACE_HOURS * 60 * 60 * 1000);
    const assignments = await this.prisma.checkinStaffAssignment.findMany({
      where: {
        staffId,
        status: 'ACTIVE',
        concert: { endsAt: { gte: cutoff } },
      },
      orderBy: { concert: { startsAt: 'asc' } },
      select: {
        id: true,
        concertId: true,
        gateName: true,
        status: true,
        concert: { select: { title: true, startsAt: true } },
      },
    });

    return assignments.map((assignment) => ({
      assignmentId: assignment.id,
      concertId: assignment.concertId,
      concertTitle: assignment.concert.title,
      ...(assignment.gateName ? { gate: assignment.gateName } : {}),
      startsAt: assignment.concert.startsAt,
      status: 'ACTIVE',
    }));
  }
}
