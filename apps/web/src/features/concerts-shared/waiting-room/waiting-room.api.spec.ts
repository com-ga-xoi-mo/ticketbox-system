import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return { MockApiError, get: vi.fn(), put: vi.fn(), patch: vi.fn() };
});

vi.mock('../../../shared/api/client', () => ({
  ApiError: mocks.MockApiError,
  get: mocks.get,
  put: mocks.put,
  patch: mocks.patch,
}));

import {
  getWaitingRoomConfig,
  saveWaitingRoomConfig,
  setWaitingRoomOverride,
} from './waiting-room.api';

const config = {
  id: '11111111-1111-4111-8111-111111111111',
  concertId: '22222222-2222-4222-8222-222222222222',
  enabled: true,
  autoActivate: false,
  manualOverride: 'NONE' as const,
  maxConcurrency: 500,
  admissionTtlSeconds: 600,
  activateThreshold: 500,
  deactivateThreshold: 100,
  cooldownSeconds: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('waiting-room API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads and parses an existing config', async () => {
    mocks.get.mockResolvedValue(config);
    await expect(getWaitingRoomConfig(config.concertId)).resolves.toEqual(config);
    expect(mocks.get).toHaveBeenCalledWith(`/organizer/waiting-room/${config.concertId}`);
  });

  it('maps only a typed 404 to an unconfigured room', async () => {
    mocks.get.mockRejectedValue(new mocks.MockApiError('Not found', 404));
    await expect(getWaitingRoomConfig(config.concertId)).resolves.toBeNull();

    const forbidden = new mocks.MockApiError('Forbidden', 403);
    mocks.get.mockRejectedValue(forbidden);
    await expect(getWaitingRoomConfig(config.concertId)).rejects.toBe(forbidden);
  });

  it('saves the validated full payload and parses the response', async () => {
    mocks.put.mockResolvedValue(config);
    await expect(saveWaitingRoomConfig(config.concertId, {
      enabled: true, autoActivate: false, manualOverride: 'NONE', maxConcurrency: 500,
      admissionTtlSeconds: 600, activateThreshold: 500, deactivateThreshold: 100, cooldownSeconds: 60,
    })).resolves.toEqual(config);
    expect(mocks.put).toHaveBeenCalledWith(`/organizer/waiting-room/${config.concertId}`, expect.objectContaining({ maxConcurrency: 500 }));
  });

  it('sends the exact override payload', async () => {
    mocks.patch.mockResolvedValue({ ...config, manualOverride: 'FORCE_ON' });
    await setWaitingRoomOverride(config.concertId, { manualOverride: 'FORCE_ON' });
    expect(mocks.patch).toHaveBeenCalledWith(
      `/organizer/waiting-room/${config.concertId}/override`,
      { manualOverride: 'FORCE_ON' },
    );
  });

  it('rejects malformed successful responses', async () => {
    mocks.get.mockResolvedValue({ ...config, concertId: 'not-a-uuid' });
    await expect(getWaitingRoomConfig(config.concertId)).rejects.toThrow('unexpected response');
  });
});
