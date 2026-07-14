import { describe, expect, it } from 'vitest';

import { waitingRoomKeys } from './waiting-room.hooks';

describe('waitingRoomKeys', () => {
  it('separates cached configuration by authenticated portal scope and concert', () => {
    const admin = waitingRoomKeys.detail({ role: 'ADMIN', sub: 'admin-1' }, 'concert-1');
    const organizer = waitingRoomKeys.detail({ role: 'ORGANIZER', sub: 'organizer-1' }, 'concert-1');
    const otherConcert = waitingRoomKeys.detail({ role: 'ADMIN', sub: 'admin-1' }, 'concert-2');

    expect(admin).not.toEqual(organizer);
    expect(admin).not.toEqual(otherConcert);
  });
});
