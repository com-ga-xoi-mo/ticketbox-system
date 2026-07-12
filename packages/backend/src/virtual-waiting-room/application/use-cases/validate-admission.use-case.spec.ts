import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WaitingRoomAdmissionInvalidError,
  WaitingRoomAdmissionRequiredError,
} from '../../domain/errors';
import type { WaitingRoomConfigRepositoryPort } from '../../domain/ports/waiting-room-config-repository.port';
import type { WaitingRoomStorePort } from '../../domain/ports/waiting-room-store.port';
import type { WaitingRoomConfigRecord } from '../../domain/waiting-room.types';
import type { ComputeEffectiveActiveUseCase } from './compute-effective-active.use-case';
import { ValidateAdmissionUseCase } from './validate-admission.use-case';

const now = new Date('2026-07-10T10:00:00.000Z');

function buildConfig(
  overrides: Partial<WaitingRoomConfigRecord> = {},
): WaitingRoomConfigRecord {
  return {
    id: 'config-1',
    concertId: 'concert-1',
    enabled: true,
    autoActivate: false,
    manualOverride: 'FORCE_ON',
    maxConcurrency: 1,
    admissionTtlSeconds: 600,
    activateThreshold: 10,
    deactivateThreshold: 5,
    cooldownSeconds: 30,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildConfigRepository(): WaitingRoomConfigRepositoryPort {
  return {
    findByConcertId: vi.fn(async () => buildConfig()),
    upsert: vi.fn(),
    setManualOverride: vi.fn(),
    listRunnableRooms: vi.fn(),
    concertExists: vi.fn(),
  };
}

function buildStore(): WaitingRoomStorePort {
  return {
    joinQueue: vi.fn(),
    leave: vi.fn(),
    getQueueStatus: vi.fn(),
    admitBatch: vi.fn(),
    validateAdmission: vi.fn(),
    releaseAdmissionSlot: vi.fn(),
    incrementLoad: vi.fn(),
    updateLoadState: vi.fn(),
    readLoadState: vi.fn(),
    withConcertLock: vi.fn(),
  };
}

function buildComputeActive(): ComputeEffectiveActiveUseCase {
  return {
    execute: vi.fn(async () => ({ active: true, reason: 'FORCE_ON' })),
  } as unknown as ComputeEffectiveActiveUseCase;
}

describe('ValidateAdmissionUseCase', () => {
  let configs: WaitingRoomConfigRepositoryPort;
  let store: WaitingRoomStorePort;
  let computeActive: ComputeEffectiveActiveUseCase;
  let useCase: ValidateAdmissionUseCase;

  beforeEach(() => {
    configs = buildConfigRepository();
    store = buildStore();
    computeActive = buildComputeActive();
    useCase = new ValidateAdmissionUseCase(configs, store, computeActive);
  });

  it('allows checkout without a token when the waiting room is inactive', async () => {
    vi.mocked(computeActive.execute).mockResolvedValue({
      active: false,
      reason: 'AUTO_INACTIVE',
    });

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        failOpen: false,
        now,
      }),
    ).resolves.toBeUndefined();

    expect(store.validateAdmission).not.toHaveBeenCalled();
  });

  it('requires a token when the waiting room is active', async () => {
    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        failOpen: false,
        now,
      }),
    ).rejects.toThrow(WaitingRoomAdmissionRequiredError);
  });

  it('rejects a token that is not bound to the requesting user and concert', async () => {
    vi.mocked(store.validateAdmission).mockResolvedValue(null);

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        token: 'foreign-token',
        failOpen: false,
        now,
      }),
    ).rejects.toThrow(WaitingRoomAdmissionInvalidError);

    expect(store.validateAdmission).toHaveBeenCalledWith({
      concertId: 'concert-1',
      userId: 'user-1',
      token: 'foreign-token',
      now,
    });
  });

  it('accepts a token when Redis confirms the bound admission record', async () => {
    vi.mocked(store.validateAdmission).mockResolvedValue({
      concertId: 'concert-1',
      userId: 'user-1',
      token: 'admission-token-1',
      expiresAt: new Date('2026-07-10T10:10:00.000Z'),
    });

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        token: 'admission-token-1',
        failOpen: false,
        now,
      }),
    ).resolves.toBeUndefined();
  });

  it('fails open when active-state lookup fails and fail-open is enabled', async () => {
    vi.mocked(configs.findByConcertId).mockRejectedValue(
      new Error('Redis unavailable'),
    );

    await expect(
      useCase.execute({
        concertId: 'concert-1',
        userId: 'user-1',
        failOpen: true,
        now,
      }),
    ).resolves.toBeUndefined();

    expect(store.validateAdmission).not.toHaveBeenCalled();
  });
});
