import { Injectable } from '@nestjs/common';

import type {
  StaffAssignmentQueryPort,
  StaffAssignmentReadModel,
} from '../../application/ports/staff-assignment-query.port';
import { PrismaService } from '../../../platform/database/prisma.service';

@Injectable()
export class PrismaStaffAssignmentQueryAdapter implements StaffAssignmentQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveByStaffId(staffId: string): Promise<StaffAssignmentReadModel[]> {
    const assignments = await this.prisma.checkinStaffAssignment.findMany({
      where: { staffId, status: 'ACTIVE' },
      orderBy: { assignedAt: 'asc' },
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
