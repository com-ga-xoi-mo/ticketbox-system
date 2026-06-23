export const STAFF_ASSIGNMENT_QUERY = Symbol('StaffAssignmentQuery');

export interface StaffAssignmentReadModel {
  assignmentId: string;
  concertId: string;
  concertTitle: string;
  gate?: string;
  startsAt?: Date;
  status: 'ACTIVE';
}

export interface StaffAssignmentQueryPort {
  listActiveByStaffId(staffId: string): Promise<StaffAssignmentReadModel[]>;
}
