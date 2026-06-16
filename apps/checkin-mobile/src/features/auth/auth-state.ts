import type { AuthApiClient, LoginRequest, MobileSession, StaffProfile } from '../../api/checkin-mobile-api.types';
import type { SessionStore } from '../../storage/session-store';

export type AuthState =
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'restoring' }
  | { readonly status: 'authenticated'; readonly session: MobileSession }
  | { readonly status: 'blocked'; readonly reason: 'NON_STAFF'; readonly profile: StaffProfile }
  | { readonly status: 'error'; readonly message: string };

export function isCheckinStaff(profile: StaffProfile): boolean {
  return profile.roles.includes('CHECKIN_STAFF');
}

export class AuthSessionController {
  constructor(
    private readonly authApi: AuthApiClient,
    private readonly sessionStore: SessionStore,
  ) {}

  async restore(): Promise<AuthState> {
    const session = await this.sessionStore.getSession();

    if (!session) {
      return { status: 'unauthenticated' };
    }

    if (!isCheckinStaff(session.profile)) {
      await this.sessionStore.clearSession();
      return { status: 'blocked', reason: 'NON_STAFF', profile: session.profile };
    }

    return { status: 'authenticated', session };
  }

  async login(request: LoginRequest): Promise<AuthState> {
    try {
      const session = await this.authApi.login(request);

      if (!isCheckinStaff(session.profile)) {
        await this.sessionStore.clearSession();
        return { status: 'blocked', reason: 'NON_STAFF', profile: session.profile };
      }

      await this.sessionStore.saveSession(session);
      return { status: 'authenticated', session };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Login failed' };
    }
  }

  async logout(): Promise<AuthState> {
    await this.sessionStore.clearSession();
    return { status: 'unauthenticated' };
  }
}
