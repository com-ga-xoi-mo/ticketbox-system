import type {
  AssignmentApiClient,
  MobileSession,
  StaffAssignment,
} from '../../api/checkin-mobile-api.types';

export type AssignmentState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | {
      readonly status: 'loaded';
      readonly assignments: readonly StaffAssignment[];
      readonly selected: StaffAssignment;
    }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string };

export class AssignmentController {
  constructor(private readonly assignmentApi: AssignmentApiClient) {}

  async load(session: MobileSession): Promise<AssignmentState> {
    try {
      const assignments = await this.assignmentApi.listStaffAssignments(session.accessToken);

      if (assignments.length === 0) {
        return { status: 'empty' };
      }

      return {
        status: 'loaded',
        assignments,
        selected: assignments[0],
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to load assignments',
      };
    }
  }

  select(current: AssignmentState, assignmentId: string): AssignmentState {
    if (current.status !== 'loaded') {
      return current;
    }

    const selected = current.assignments.find(
      (assignment) => assignment.assignmentId === assignmentId,
    );

    return selected ? { ...current, selected } : current;
  }

  canOpenScanner(state: AssignmentState): boolean {
    return state.status === 'loaded' && state.selected.status === 'ACTIVE';
  }
}
