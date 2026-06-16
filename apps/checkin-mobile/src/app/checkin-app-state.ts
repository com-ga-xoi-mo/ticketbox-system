import type { AssignmentState } from '../features/assignments/assignment-state';
import type { AuthState } from '../features/auth/auth-state';
import type { ScanWorkflowState } from '../features/scanner/scan-workflow';

export type CheckinAppRoute = 'auth' | 'assignments' | 'scanner';

export interface CheckinAppState {
  readonly route: CheckinAppRoute;
  readonly auth: AuthState;
  readonly assignments: AssignmentState;
  readonly scanner: ScanWorkflowState;
}

export function createInitialCheckinAppState(): CheckinAppState {
  return {
    route: 'auth',
    auth: { status: 'unauthenticated' },
    assignments: { status: 'idle' },
    scanner: { status: 'ready' },
  };
}

export function resolveRoute(auth: AuthState, assignments: AssignmentState): CheckinAppRoute {
  if (auth.status !== 'authenticated') {
    return 'auth';
  }

  if (assignments.status !== 'loaded') {
    return 'assignments';
  }

  return 'scanner';
}
