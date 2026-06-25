import type {
  StaffAssignmentQueryPort,
  StaffAssignmentReadModel,
} from '../ports/staff-assignment-query.port';

export class ListMyCheckinAssignmentsQuery {
  constructor(private readonly assignments: StaffAssignmentQueryPort) {}

  execute(staffId: string): Promise<StaffAssignmentReadModel[]> {
    return this.assignments.listActiveByStaffId(staffId);
  }
}
