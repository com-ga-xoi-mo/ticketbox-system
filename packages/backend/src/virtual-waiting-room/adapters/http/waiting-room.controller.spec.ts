import { describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { OrganizerWaitingRoomController } from './organizer-waiting-room.controller';
import { WaitingRoomController } from './waiting-room.controller';

describe('waiting-room HTTP controllers', () => {
  it('limits audience routes to the audience role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, WaitingRoomController.prototype.join)).toEqual([
      Role.AUDIENCE,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, WaitingRoomController.prototype.status),
    ).toEqual([Role.AUDIENCE]);
  });

  it('limits organizer routes to organizer and admin roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, OrganizerWaitingRoomController)).toEqual([
      Role.ORGANIZER,
      Role.ADMIN,
    ]);
  });

  it('joins then refreshes status after an opportunistic admit', async () => {
    const joinWaitingRoom = {
      execute: vi.fn(async () => ({
        concertId: 'concert-1',
        userId: 'user-1',
        active: true,
        status: 'WAITING',
        position: 1,
        admissionToken: null,
        admissionExpiresAt: null,
      })),
    };
    const getWaitingRoomStatus = {
      execute: vi.fn(async () => ({
        concertId: 'concert-1',
        userId: 'user-1',
        active: true,
        status: 'ADMITTED',
        position: 0,
        admissionToken: 'token-1',
        admissionExpiresAt: new Date('2026-07-09T01:15:00.000Z'),
      })),
    };
    const controller = new WaitingRoomController(
      joinWaitingRoom as never,
      { execute: vi.fn() } as never,
      getWaitingRoomStatus as never,
      { execute: vi.fn(async () => ({ admitted: [], expiredUserIds: [] })) } as never,
      { mint: vi.fn(), verify: vi.fn() } as never,
    );

    await expect(
      controller.join('concert-1', { user: { id: 'user-1' } } as never),
    ).resolves.toMatchObject({
      status: 'ADMITTED',
      admissionToken: 'token-1',
      admissionExpiresAt: '2026-07-09T01:15:00.000Z',
    });
  });
});

