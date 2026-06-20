import { describe, expect, it } from 'vitest';

import type { AuthApiClient, MobileSession } from '../../api/checkin-mobile-api.types';
import { InMemorySessionStore } from '../../storage/session-store';
import { audienceProfile, staffSession } from '../../test/fixtures';
import { AuthSessionController } from './auth-state';

class FakeAuthApi implements AuthApiClient {
  constructor(private readonly session: MobileSession) {}

  async login(): Promise<MobileSession> {
    return this.session;
  }
}

describe('AuthSessionController', () => {
  it('stores a check-in staff session after successful login', async () => {
    const store = new InMemorySessionStore();
    const controller = new AuthSessionController(new FakeAuthApi(staffSession), store);

    const state = await controller.login({ email: 'staff@ticketbox.test', password: 'secret' });

    expect(state.status).toBe('authenticated');
    await expect(store.getSession()).resolves.toEqual(staffSession);
  });

  it('restores an existing check-in staff session', async () => {
    const store = new InMemorySessionStore(staffSession);
    const controller = new AuthSessionController(new FakeAuthApi(staffSession), store);

    const state = await controller.restore();

    expect(state).toEqual({ status: 'authenticated', session: staffSession });
  });

  it('clears the stored session on logout', async () => {
    const store = new InMemorySessionStore(staffSession);
    const controller = new AuthSessionController(new FakeAuthApi(staffSession), store);

    const state = await controller.logout();

    expect(state.status).toBe('unauthenticated');
    await expect(store.getSession()).resolves.toBeNull();
  });

  it('blocks non-staff users and does not keep their session', async () => {
    const nonStaffSession: MobileSession = {
      accessToken: 'audience-token',
      profile: audienceProfile,
    };
    const store = new InMemorySessionStore();
    const controller = new AuthSessionController(new FakeAuthApi(nonStaffSession), store);

    const state = await controller.login({ email: 'audience@ticketbox.test', password: 'secret' });

    expect(state).toEqual({ status: 'blocked', reason: 'NON_STAFF', profile: audienceProfile });
    await expect(store.getSession()).resolves.toBeNull();
  });
});
