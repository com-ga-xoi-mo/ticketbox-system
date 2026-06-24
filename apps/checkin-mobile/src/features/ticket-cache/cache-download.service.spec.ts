import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MobileSession, StaffAssignment, TicketCacheApiClient } from '../../api/checkin-mobile-api.types';
import type { TicketCacheRepository } from './ticket-cache.repository';
import { CacheDownloadService } from './cache-download.service';

const timestamp = '2026-07-01T12:00:00.000Z';
const hash = 'a'.repeat(64);
const session: MobileSession = {
  accessToken: 'token',
  profile: { id: 'staff-1', email: 'staff@test.com', displayName: 'Staff', roles: ['CHECKIN_STAFF'] },
};
const assignment: StaffAssignment = {
  assignmentId: 'assignment-1',
  concertId: 'concert-1',
  concertTitle: 'Test Concert',
  gate: 'Main Gate',
  startsAt: timestamp,
  status: 'ACTIVE',
};

describe('CacheDownloadService', () => {
  let api: TicketCacheApiClient;
  let repository: Pick<TicketCacheRepository, 'replaceAll' | 'applyDelta'>;
  let service: CacheDownloadService;

  beforeEach(() => {
    api = { fetchTicketCache: vi.fn() };
    repository = { replaceAll: vi.fn(), applyDelta: vi.fn() };
    service = new CacheDownloadService(api, repository as TicketCacheRepository);
  });

  it('downloads full cache and sets status to ready', async () => {
    vi.mocked(api.fetchTicketCache).mockResolvedValue({
      entries: [{ hash, status: 'valid' }],
      syncedAt: timestamp,
    });
    await service.download(assignment, session);
    expect(service.status).toBe('ready');
    expect(service.lastCacheSyncAt).toBe(timestamp);
    expect(repository.replaceAll).toHaveBeenCalledWith(
      session.profile.id,
      assignment.concertId,
      [{ hash, status: 'valid' }],
      expect.any(String),
    );
  });

  it('applies delta when response contains upserted/voided', async () => {
    vi.mocked(api.fetchTicketCache).mockResolvedValue({
      upserted: [{ hash, status: 'checked_in' }],
      voided: [],
      syncedAt: timestamp,
    });
    await service.download(assignment, session);
    expect(service.status).toBe('ready');
    expect(repository.applyDelta).toHaveBeenCalled();
  });

  it('sets status to unavailable on API failure', async () => {
    vi.mocked(api.fetchTicketCache).mockRejectedValue(new Error('network error'));
    await service.download(assignment, session);
    expect(service.status).toBe('unavailable');
  });

  it('refreshes incrementally with since after the first full load', async () => {
    vi.mocked(api.fetchTicketCache)
      .mockResolvedValueOnce({ entries: [{ hash, status: 'valid' }], syncedAt: timestamp })
      .mockResolvedValueOnce({ upserted: [], voided: [], syncedAt: '2026-07-01T12:01:00.000Z' });

    await service.download(assignment, session);
    await service.download(assignment, session);

    expect(api.fetchTicketCache).toHaveBeenNthCalledWith(
      1,
      session.accessToken,
      expect.not.objectContaining({ since: expect.anything() }),
    );
    expect(api.fetchTicketCache).toHaveBeenNthCalledWith(
      2,
      session.accessToken,
      expect.objectContaining({ since: timestamp }),
    );
  });

  it('preserves the existing cache when a later refresh fails', async () => {
    vi.mocked(api.fetchTicketCache)
      .mockResolvedValueOnce({ entries: [{ hash, status: 'valid' }], syncedAt: timestamp })
      .mockRejectedValueOnce(new Error('network error'));

    await service.download(assignment, session);
    await service.download(assignment, session);

    expect(service.status).toBe('ready');
  });

  it('is single-flight: concurrent calls issue one request', async () => {
    let resolve!: (value: { entries: never[]; syncedAt: string }) => void;
    vi.mocked(api.fetchTicketCache).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const a = service.download(assignment, session);
    const b = service.download(assignment, session);
    resolve({ entries: [], syncedAt: timestamp });
    await Promise.all([a, b]);

    expect(api.fetchTicketCache).toHaveBeenCalledTimes(1);
  });
});
