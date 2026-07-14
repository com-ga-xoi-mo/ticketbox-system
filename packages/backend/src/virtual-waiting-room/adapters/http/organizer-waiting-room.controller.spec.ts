import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ConcertNotFoundError, ForbiddenConcertOwnershipError } from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import { WaitingRoomInvalidConfigError } from '../../domain/errors';
import { OrganizerWaitingRoomController } from './organizer-waiting-room.controller';

const organizerRequest = { user: { id: 'organizer-1', roles: [Role.ORGANIZER] } } as never;
const adminRequest = { user: { id: 'admin-1', roles: [Role.ADMIN] } } as never;
const response = {
  id: 'config-1', concertId: 'concert-1', enabled: true, autoActivate: false,
  manualOverride: 'NONE', maxConcurrency: 500, admissionTtlSeconds: 600,
  activateThreshold: 500, deactivateThreshold: 100, cooldownSeconds: 60,
  createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

type ExecuteStub = { execute: ReturnType<typeof vi.fn> };

function makeController(overrides: Partial<Record<'get' | 'configure' | 'override', ExecuteStub>> = {}) {
  return new OrganizerWaitingRoomController(
    (overrides.configure ?? { execute: vi.fn().mockResolvedValue(response) }) as never,
    (overrides.get ?? { execute: vi.fn().mockResolvedValue(response) }) as never,
    (overrides.override ?? { execute: vi.fn().mockResolvedValue(response) }) as never,
  );
}

describe('OrganizerWaitingRoomController', () => {
  it('forwards organizer actor context for reads and serializes config', async () => {
    const get = { execute: vi.fn().mockResolvedValue(response) };
    const controller = makeController({ get });

    await expect(controller.get('concert-1', organizerRequest)).resolves.toMatchObject({
      id: 'config-1', createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(get.execute).toHaveBeenCalledWith({
      concertId: 'concert-1', actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] }, allowAdminOverride: false,
    });
  });

  it('forwards admin override context for writes', async () => {
    const configure = { execute: vi.fn().mockResolvedValue(response) };
    const controller = makeController({ configure });
    await controller.configure('concert-1', {
      enabled: true, autoActivate: false, manualOverride: 'NONE', maxConcurrency: 1,
      admissionTtlSeconds: 1, activateThreshold: 2, deactivateThreshold: 1, cooldownSeconds: 0,
    }, adminRequest);
    expect(configure.execute).toHaveBeenCalledWith(expect.objectContaining({
      actor: { userId: 'admin-1', roles: [Role.ADMIN] }, allowAdminOverride: true,
    }));
  });

  it('maps ownership failures to 403 and missing targets to 404', async () => {
    const forbidden = makeController({ get: { execute: vi.fn().mockRejectedValue(new ForbiddenConcertOwnershipError('concert-1')) } });
    await expect(forbidden.get('concert-1', organizerRequest)).rejects.toBeInstanceOf(ForbiddenException);

    const missing = makeController({ override: { execute: vi.fn().mockRejectedValue(new ConcertNotFoundError('concert-1')) } });
    await expect(missing.override('concert-1', { manualOverride: 'NONE' }, organizerRequest)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps invalid config to 400 and rejects malformed bodies safely', async () => {
    const invalid = makeController({ configure: { execute: vi.fn().mockRejectedValue(new WaitingRoomInvalidConfigError('invalid')) } });
    await expect(invalid.configure('concert-1', {
      enabled: true, autoActivate: false, manualOverride: 'NONE', maxConcurrency: 1,
      admissionTtlSeconds: 1, activateThreshold: 2, deactivateThreshold: 1, cooldownSeconds: 0,
    }, organizerRequest)).rejects.toBeInstanceOf(BadRequestException);

    await expect(invalid.configure('concert-1', {}, organizerRequest)).rejects.toBeInstanceOf(BadRequestException);
  });
});
