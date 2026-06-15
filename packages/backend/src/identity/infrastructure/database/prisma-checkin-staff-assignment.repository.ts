import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import {
  CheckinAssignmentNotFoundError,
  DuplicateCheckinAssignmentError,
} from '../../domain/errors';
import type {
  CheckinStaffAssignmentRecord,
  CheckinStaffAssignmentRepositoryPort,
  CreateCheckinStaffAssignmentData,
} from '../../domain/ports/checkin-staff-assignment.port';

const ACTIVE_ASSIGNMENT_STATUS = 'ACTIVE';
const REVOKED_ASSIGNMENT_STATUS = 'REVOKED';
const CHECKIN_STAFF_ROLE = 'CHECKIN_STAFF';
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PRISMA_UNIQUE_CONSTRAINT
  );
}

@Injectable()
export class PrismaCheckinStaffAssignmentRepository
  implements CheckinStaffAssignmentRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findActiveAssignment(params: {
    staffUserId: string;
    concertId: string;
    gateName?: string;
  }): Promise<CheckinStaffAssignmentRecord | null> {
    const assignments = await this.prisma.checkinStaffAssignment.findMany({
      where: {
        staffId: params.staffUserId,
        concertId: params.concertId,
        status: ACTIVE_ASSIGNMENT_STATUS,
      },
      orderBy: [{ gateName: 'asc' }, { assignedAt: 'asc' }],
    });

    if (assignments.length === 0) {
      return null;
    }

    if (!params.gateName) {
      return this.toAssignmentRecord(assignments[0]);
    }

    const exactGate = assignments.find((assignment) => assignment.gateName === params.gateName);
    if (exactGate) {
      return this.toAssignmentRecord(exactGate);
    }

    const concertWide = assignments.find((assignment) => assignment.gateName === null);
    return this.toAssignmentRecord(concertWide ?? assignments[0]);
  }

  async listActiveAssignments(concertId: string): Promise<CheckinStaffAssignmentRecord[]> {
    const assignments = await this.prisma.checkinStaffAssignment.findMany({
      where: {
        concertId,
        status: ACTIVE_ASSIGNMENT_STATUS,
      },
      orderBy: [{ gateName: 'asc' }, { assignedAt: 'asc' }],
    });

    return assignments.map((assignment) => this.toAssignmentRecord(assignment));
  }

  async createActiveAssignment(
    data: CreateCheckinStaffAssignmentData,
  ): Promise<CheckinStaffAssignmentRecord> {
    const existing = await this.prisma.checkinStaffAssignment.findFirst({
      where: {
        staffId: data.staffUserId,
        concertId: data.concertId,
        gateName: data.gateName ?? null,
        status: ACTIVE_ASSIGNMENT_STATUS,
      },
    });

    if (existing) {
      throw new DuplicateCheckinAssignmentError(
        data.staffUserId,
        data.concertId,
        data.gateName,
      );
    }

    try {
      const assignment = await this.prisma.checkinStaffAssignment.create({
        data: {
          staffId: data.staffUserId,
          concertId: data.concertId,
          gateName: data.gateName ?? null,
          status: ACTIVE_ASSIGNMENT_STATUS,
        },
      });

      return this.toAssignmentRecord(assignment);
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        throw new DuplicateCheckinAssignmentError(
          data.staffUserId,
          data.concertId,
          data.gateName,
        );
      }
      throw err;
    }
  }

  async revokeAssignment(params: {
    assignmentId: string;
    concertId: string;
  }): Promise<CheckinStaffAssignmentRecord> {
    const existing = await this.prisma.checkinStaffAssignment.findFirst({
      where: {
        id: params.assignmentId,
        concertId: params.concertId,
      },
    });

    if (!existing) {
      throw new CheckinAssignmentNotFoundError(params.assignmentId);
    }

    if (existing.status === REVOKED_ASSIGNMENT_STATUS) {
      return this.toAssignmentRecord(existing);
    }

    const assignment = await this.prisma.checkinStaffAssignment.update({
      where: { id: params.assignmentId },
      data: {
        status: REVOKED_ASSIGNMENT_STATUS,
        revokedAt: new Date(),
      },
    });

    return this.toAssignmentRecord(assignment);
  }

  async userHasCheckinStaffRole(userId: string): Promise<boolean | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            role: {
              select: { code: true },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return user.roles.some((userRole) => userRole.role.code === CHECKIN_STAFF_ROLE);
  }

  private toAssignmentRecord(assignment: {
    id: string;
    staffId: string;
    concertId: string;
    gateName: string | null;
    status: string;
    assignedAt: Date;
    revokedAt: Date | null;
  }): CheckinStaffAssignmentRecord {
    return {
      id: assignment.id,
      staffUserId: assignment.staffId,
      concertId: assignment.concertId,
      gateName: assignment.gateName ?? undefined,
      status: assignment.status === REVOKED_ASSIGNMENT_STATUS ? 'REVOKED' : 'ACTIVE',
      assignedAt: assignment.assignedAt,
      revokedAt: assignment.revokedAt ?? undefined,
    };
  }
}
