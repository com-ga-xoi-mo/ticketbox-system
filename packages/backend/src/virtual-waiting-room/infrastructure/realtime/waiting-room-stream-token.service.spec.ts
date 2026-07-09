import { describe, expect, it, vi } from 'vitest';

import { WaitingRoomStreamTokenService } from './waiting-room-stream-token.service';

describe('WaitingRoomStreamTokenService', () => {
  it('rejects tokens minted for another concert', () => {
    const jwt = {
      sign: vi.fn(() => 'token-1'),
      verify: vi.fn(() => ({
        sub: 'user-1',
        scope: 'waiting-room-stream',
        concertId: 'concert-1',
      })),
    };
    const service = new WaitingRoomStreamTokenService(jwt as never);

    expect(service.mint('user-1', 'concert-1')).toBe('token-1');
    expect(service.verify('token-1', 'concert-2')).toBeNull();
    expect(service.verify('token-1', 'concert-1')).toBe('user-1');
  });
});

