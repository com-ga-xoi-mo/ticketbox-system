import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Actor } from '../../../identity/application/use-cases/authorization.types';
import { ConcertNotFoundError, ForbiddenConcertOwnershipError } from '../../../identity/domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import { WaitingRoomInvalidConfigError } from '../../domain/errors';
import type { WaitingRoomConfigRepositoryPort } from '../../domain/ports/waiting-room-config-repository.port';
import type { WaitingRoomConfigRecord } from '../../domain/waiting-room.types';
import { ConfigureWaitingRoomUseCase } from './configure-waiting-room.use-case';
import { GetWaitingRoomConfigUseCase } from './get-waiting-room-config.use-case';
import { SetWaitingRoomOverrideUseCase } from './set-waiting-room-override.use-case';

const organizer: Actor = { userId: 'organizer-1', roles: [Role.ORGANIZER] };
const admin: Actor = { userId: 'admin-1', roles: [Role.ADMIN] };

function config(): WaitingRoomConfigRecord {
  return {
    id: 'config-1', concertId: 'concert-1', enabled: true, autoActivate: false,
    manualOverride: 'NONE', maxConcurrency: 500, admissionTtlSeconds: 600,
    activateThreshold: 500, deactivateThreshold: 100, cooldownSeconds: 60,
    createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('waiting-room management use cases', () => {
  let repository: WaitingRoomConfigRepositoryPort;
  let authorize: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findByConcertId: vi.fn(), upsert: vi.fn(), setManualOverride: vi.fn(),
      listRunnableRooms: vi.fn(), concertExists: vi.fn(),
    };
    authorize = { execute: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(repository.concertExists).mockResolvedValue(true);
  });

  it('authorizes an organizer before reading their configuration', async () => {
    vi.mocked(repository.findByConcertId).mockResolvedValue(config());
    const useCase = new GetWaitingRoomConfigUseCase(repository, authorize as never);

    await expect(useCase.execute({ concertId: 'concert-1', actor: organizer, allowAdminOverride: false }))
      .resolves.toMatchObject({ id: 'config-1' });
    expect(authorize.execute).toHaveBeenCalledWith({ actor: organizer, concertId: 'concert-1', allowAdminOverride: false });
    expect(repository.concertExists).toHaveBeenCalledWith('concert-1');
  });

  it('stops a non-owner before configuration access', async () => {
    authorize.execute.mockRejectedValueOnce(new ForbiddenConcertOwnershipError('concert-1'));
    const useCase = new ConfigureWaitingRoomUseCase(repository, authorize as never);

    await expect(useCase.execute({ ...config(), actor: organizer, allowAdminOverride: false }))
      .rejects.toThrow(ForbiddenConcertOwnershipError);
    expect(repository.concertExists).not.toHaveBeenCalled();
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('checks target existence for an admin override before persistence', async () => {
    vi.mocked(repository.concertExists).mockResolvedValue(false);
    const useCase = new ConfigureWaitingRoomUseCase(repository, authorize as never);

    await expect(useCase.execute({ ...config(), actor: admin, allowAdminOverride: true }))
      .rejects.toThrow(ConcertNotFoundError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('keeps invalid config validation after authorization', async () => {
    const useCase = new ConfigureWaitingRoomUseCase(repository, authorize as never);
    await expect(useCase.execute({ ...config(), maxConcurrency: 0, actor: organizer, allowAdminOverride: false }))
      .rejects.toThrow(WaitingRoomInvalidConfigError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('allows an admin to override an existing concert after authorization', async () => {
    vi.mocked(repository.setManualOverride).mockResolvedValue({ ...config(), manualOverride: 'FORCE_ON' });
    const useCase = new SetWaitingRoomOverrideUseCase(repository, authorize as never);

    await expect(useCase.execute({ concertId: 'concert-1', manualOverride: 'FORCE_ON', actor: admin, allowAdminOverride: true }))
      .resolves.toMatchObject({ manualOverride: 'FORCE_ON' });
    expect(authorize.execute).toHaveBeenCalledWith({ actor: admin, concertId: 'concert-1', allowAdminOverride: true });
  });
});
