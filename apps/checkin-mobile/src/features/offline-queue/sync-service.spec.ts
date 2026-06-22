import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CheckinApiClient } from '../../api/checkin-mobile-api.types';
import { staffSession } from '../../test/fixtures';
import {
  ApiRequestError,
  ApiResponseValidationError,
  ApiTransportError,
} from '../../api/http-checkin-mobile-api-client';
import { FakeNetworkMonitor } from './fake-network-monitor';
import { InMemoryOfflineScanQueue } from './in-memory-offline-scan-queue';
import { SyncService } from './sync-service';

const ticketId = '33333333-3333-4333-8333-333333333333';
const checkedInAt = '2026-06-21T08:00:00.000Z';

async function fill(queue: InMemoryOfflineScanQueue, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await queue.enqueue({
      localId: `local-${index}`,
      staffUserId: staffSession.profile.id,
      deviceId: 'device-1',
      scannedAt: new Date(2026, 5, 21, 8, 0, index).toISOString(),
      qrPayloadHash: 'a'.repeat(64),
      assignmentId: '11111111-1111-4111-8111-111111111111',
      concertId: '22222222-2222-4222-8222-222222222222',
    });
  }
}

function client(submitBatchSync: CheckinApiClient['submitBatchSync']): CheckinApiClient {
  return { submitBatchSync, submitOnlineScan: vi.fn() };
}

describe('SyncService', () => {
  afterEach(() => vi.useRealTimers());

  it('drains current-account events sequentially in chunks of 100', async () => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 201);
    await queue.enqueue({
      localId: 'other-account',
      staffUserId: 'staff-2',
      deviceId: 'device-2',
      scannedAt: checkedInAt,
      qrPayloadHash: 'b'.repeat(64),
      assignmentId: '11111111-1111-4111-8111-111111111111',
      concertId: '22222222-2222-4222-8222-222222222222',
    });
    const sizes: number[] = [];
    const service = new SyncService(
      queue,
      client(async (_token, request) => {
        sizes.push(request.length);
        return request.map(({ localId }) => ({ localId, status: 'duplicate', message: 'Done' }));
      }),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );

    await service.trigger(staffSession);
    expect(sizes).toEqual([100, 100, 1]);
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(0);
    await expect(queue.getPendingCount('staff-2')).resolves.toBe(1);
    service.dispose();
  });

  it('correlates unique IDs and stores partial terminal outcomes without retrying them', async () => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 3);
    const service = new SyncService(
      queue,
      client(async (_token, request) => [
        { localId: request[0].localId, status: 'accepted', message: 'Accepted', ticketId, checkedInAt },
        { localId: request[1].localId, status: 'invalid', message: 'Invalid', reasonCode: 'INVALID_TICKET' },
        { localId: request[2].localId, status: 'conflict', message: 'Conflict', conflictReason: 'Other device' },
      ]),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    const state = await service.trigger(staffSession);
    expect(state.counts).toMatchObject({ accepted: 1, invalid: 1, conflict: 1 });
    await expect(queue.getFailedScanEvents(staffSession.profile.id)).resolves.toHaveLength(2);
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(0);
    service.dispose();
  });

  it('retries network/5xx failures with backoff while preserving pending rows', async () => {
    vi.useFakeTimers();
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    const submit = vi
      .fn<CheckinApiClient['submitBatchSync']>()
      .mockRejectedValueOnce(new ApiRequestError('Unavailable', 503))
      .mockImplementationOnce(async (_token, request) =>
        request.map(({ localId }) => ({ localId, status: 'duplicate', message: 'Done' })),
      );
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
      () => 0.5,
    );
    const run = service.trigger(staffSession);
    await vi.advanceTimersByTimeAsync(1_000);
    await run;
    expect(submit).toHaveBeenCalledTimes(2);
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(0);
    service.dispose();
  });

  it.each([
    new ApiTransportError('offline'),
    new ApiResponseValidationError('unknown commit'),
  ])('retries explicit retryable failure %s', async (failure) => {
    vi.useFakeTimers();
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    const submit = vi
      .fn<CheckinApiClient['submitBatchSync']>()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(async (_token, request) =>
        request.map(({ localId }) => ({ localId, status: 'duplicate', message: 'Done' })),
      );
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
      () => 0.5,
    );
    const run = service.trigger(staffSession);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(run).resolves.toMatchObject({ status: 'idle' });
    expect(submit).toHaveBeenCalledTimes(2);
    service.dispose();
  });

  it.each([
    ['incomplete response', async () => []],
    [
      'duplicate correlation',
      async () => [
        { localId: 'local-0', status: 'duplicate' as const, message: 'Done' },
        { localId: 'local-0', status: 'duplicate' as const, message: 'Done again' },
      ],
    ],
  ])('stops on %s without retrying or removing pending rows', async (_name, submitBatchSync) => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    const submit = vi.fn(submitBatchSync);
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    await expect(service.trigger(staffSession)).resolves.toMatchObject({ status: 'error' });
    expect(submit).toHaveBeenCalledOnce();
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(1);
    service.dispose();
  });

  it('stops on queue/database failures without entering backoff', async () => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    queue.getPendingScanEvents = vi.fn(async () => {
      throw new Error('SQLite read failed');
    });
    const submit = vi.fn();
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    await expect(service.trigger(staffSession)).resolves.toEqual({
      status: 'error',
      counts: { accepted: 0, duplicate: 0, invalid: 0, conflict: 0, unassigned: 0 },
      message: 'SQLite read failed',
    });
    expect(submit).not.toHaveBeenCalled();
    expect(queue.events.get('local-0')?.syncStatus).toBe('pending');
    service.dispose();
  });

  it('stops when queue persistence fails while applying a confirmed response', async () => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    queue.markSynced = vi.fn(async () => {
      throw new Error('SQLite write failed');
    });
    const submit = vi.fn(async () => [
      { localId: 'local-0', status: 'duplicate' as const, message: 'Done' },
    ]);
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    await expect(service.trigger(staffSession)).resolves.toMatchObject({
      status: 'error',
      message: 'SQLite write failed',
    });
    expect(submit).toHaveBeenCalledOnce();
    expect(queue.events.get('local-0')?.syncStatus).toBe('pending');
    service.dispose();
  });

  it.each([
    [401, 'authentication-required'],
    [403, 'forbidden'],
  ] as const)('stops on HTTP %s and resumes pending work only on a later trigger', async (status, expected) => {
    const queue = new InMemoryOfflineScanQueue();
    await fill(queue, 1);
    const submit = vi
      .fn<CheckinApiClient['submitBatchSync']>()
      .mockRejectedValueOnce(new ApiRequestError('Denied', status))
      .mockImplementationOnce(async (_token, request) =>
        request.map(({ localId }) => ({ localId, status: 'duplicate', message: 'Done' })),
      );
    const service = new SyncService(
      queue,
      client(submit),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    await expect(service.trigger(staffSession)).resolves.toMatchObject({ status: expected });
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(1);
    await service.trigger(staffSession);
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(0);
    service.dispose();
  });

  it('is single-flight for auto/manual triggers, handles empty queues, and disposes subscriptions', async () => {
    const queue = new InMemoryOfflineScanQueue();
    const network = new FakeNetworkMonitor(true);
    let resolveBatch!: (value: [{ localId: string; status: 'duplicate'; message: string }]) => void;
    const batch = new Promise<[{ localId: string; status: 'duplicate'; message: string }]>(
      (resolve) => {
      resolveBatch = resolve;
      },
    );
    await fill(queue, 1);
    const submit = vi.fn(async () => batch);
    const service = new SyncService(queue, client(submit), network, () => staffSession);
    const manual = service.trigger(staffSession);
    const joined = service.triggerAuthenticatedSession();
    expect(joined).toBe(manual);
    resolveBatch([{ localId: 'local-0', status: 'duplicate', message: 'Done' }]);
    await expect(manual).resolves.toMatchObject({ status: 'idle' });
    service.dispose();
    network.setOnline(false);
    network.setOnline(true);
    expect(submit).toHaveBeenCalledOnce();

    const empty = new SyncService(
      new InMemoryOfflineScanQueue(),
      client(vi.fn()),
      new FakeNetworkMonitor(true),
      () => staffSession,
    );
    await expect(empty.trigger(staffSession)).resolves.toMatchObject({ status: 'idle' });
    empty.dispose();
  });
});
