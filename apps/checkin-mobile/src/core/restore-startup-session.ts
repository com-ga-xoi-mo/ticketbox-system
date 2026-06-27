import type { AssignmentState } from '../features/assignments/assignment-state';
import type { AuthState } from '../features/auth/auth-state';

export interface StartupAuthController {
  restore(): Promise<AuthState>;
}

export interface StartupAssignmentController {
  load(session: Extract<AuthState, { status: 'authenticated' }>['session']): Promise<AssignmentState>;
}

export interface StartupSessionResult {
  readonly auth: AuthState;
  readonly assignments: AssignmentState;
}

export async function restoreStartupSession(
  authController: StartupAuthController,
  assignmentController: StartupAssignmentController,
): Promise<StartupSessionResult> {
  try {
    const auth = await authController.restore();

    if (auth.status !== 'authenticated') {
      return { auth, assignments: { status: 'idle' } };
    }

    return {
      auth,
      assignments: await assignmentController.load(auth.session),
    };
  } catch (error) {
    return {
      auth: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to restore session',
      },
      assignments: { status: 'idle' },
    };
  }
}
