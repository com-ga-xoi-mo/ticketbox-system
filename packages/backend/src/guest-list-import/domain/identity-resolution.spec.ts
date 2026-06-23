import { GuestListEntryStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { resolveIdentity } from './identity-resolution';

const guest = (id: string, email: string) => ({
  id,
  concertId: 'c',
  latestBatchId: 'b',
  guestName: id,
  normalizedEmail: email,
  status: GuestListEntryStatus.ACTIVE,
});
describe('identity resolution', () => {
  it('returns none, one match, and deterministic conflict', () => {
    expect(resolveIdentity({ normalizedEmail: 'a@x.test' }, [])).toEqual({ kind: 'none' });
    expect(
      resolveIdentity({ normalizedEmail: 'a@x.test' }, [guest('1', 'a@x.test')]),
    ).toMatchObject({ kind: 'match' });
    expect(
      resolveIdentity({ normalizedEmail: 'a@x.test', normalizedPhone: '+841' }, [
        { ...guest('2', 'b@x.test'), normalizedPhone: '+841' },
        guest('1', 'a@x.test'),
      ]),
    ).toEqual({ kind: 'conflict', guestIds: ['1', '2'] });
  });
});
