export const CHECKIN_STAFF_ASSIGNMENT_REPOSITORY = Symbol('CheckinStaffAssignmentRepository');

export type CheckinAssignmentStatus = 'ACTIVE' | 'REVOKED';

export interface CheckinStaffAssignmentRecord {
  id: string;
  staffUserId: string;
  concertId: string;
  gateName?: string;
  status: CheckinAssignmentStatus;
  assignedAt: Date;
  revokedAt?: Date;
}

export interface CreateCheckinStaffAssignmentData {
  staffUserId: string;
  concertId: string;
  gateName?: string;
}

export interface CheckinStaffAssignmentRepositoryPort {
  findAssignmentById(assignmentId: string): Promise<CheckinStaffAssignmentRecord | null>;

  findActiveAssignment(params: {
    staffUserId: string;
    concertId: string;
    gateName?: string;
  }): Promise<CheckinStaffAssignmentRecord | null>;

  listActiveAssignments(concertId: string): Promise<CheckinStaffAssignmentRecord[]>;

  createActiveAssignment(
    data: CreateCheckinStaffAssignmentData,
  ): Promise<CheckinStaffAssignmentRecord>;

  revokeAssignment(params: {
    assignmentId: string;
    concertId: string;
  }): Promise<CheckinStaffAssignmentRecord>;

  userHasCheckinStaffRole(userId: string): Promise<boolean | null>;
}
