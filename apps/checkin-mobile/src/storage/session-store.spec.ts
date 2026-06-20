import { describe, expect, it } from 'vitest';

import { staffSession } from '../test/fixtures';
import { InMemorySessionStore } from './session-store';

describe('InMemorySessionStore', () => {
  it('saves, restores, and clears a staff session', async () => {
    const store = new InMemorySessionStore();

    await expect(store.getSession()).resolves.toBeNull();

    await store.saveSession(staffSession);
    await expect(store.getSession()).resolves.toEqual(staffSession);

    await store.clearSession();
    await expect(store.getSession()).resolves.toBeNull();
  });
});
