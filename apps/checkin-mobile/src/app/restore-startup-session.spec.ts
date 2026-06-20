import { describe, expect, it, vi } from 'vitest';

import { staffSession } from '../test/fixtures';
import { restoreStartupSession } from './restore-startup-session';

describe('application startup session restoration', () => {
  it('invokes restore and loads assignments for a restored staff session', async () => {
    const restore = vi.fn(async () => ({ status: 'authenticated' as const, session: staffSession }));
    const load = vi.fn(async () => ({ status: 'empty' as const }));

    const result = await restoreStartupSession({ restore }, { load });

    expect(restore).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith(staffSession);
    expect(result).toEqual({
      auth: { status: 'authenticated', session: staffSession },
      assignments: { status: 'empty' },
    });
  });

  it.each([
    { status: 'unauthenticated' as const },
    { status: 'blocked' as const, reason: 'NON_STAFF' as const, profile: staffSession.profile },
  ])('does not load assignments when restoration returns $status', async (auth) => {
    const load = vi.fn();

    const result = await restoreStartupSession({ restore: async () => auth }, { load });

    expect(load).not.toHaveBeenCalled();
    expect(result.assignments).toEqual({ status: 'idle' });
  });

  it('keeps assignment loading idle when restoration fails', async () => {
    const load = vi.fn();

    const result = await restoreStartupSession(
      { restore: async () => Promise.reject(new Error('secure storage failed')) },
      { load },
    );

    expect(load).not.toHaveBeenCalled();
    expect(result).toEqual({
      auth: { status: 'error', message: 'secure storage failed' },
      assignments: { status: 'idle' },
    });
  });
});
