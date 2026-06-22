import { describe, expect, it, vi } from 'vitest';

import type {
  CheckinApiClient,
  OnlineScanRequest,
  OnlineScanResult,
} from '../../api/checkin-mobile-api.types';
import { activeAssignment, staffSession } from '../../test/fixtures';
import { ScanWorkflow } from './scan-workflow';
import { FakeNetworkMonitor } from '../offline-queue/fake-network-monitor';
import { InMemoryOfflineScanQueue } from '../offline-queue/in-memory-offline-scan-queue';

class Deferred<T> {
  readonly promise: Promise<T>;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve;
    });
  }
}

describe('ScanWorkflow', () => {
  const submitBatchSync = vi.fn();
  it('creates an online scan request and maps accepted results', async () => {
    const seenRequests: OnlineScanRequest[] = [];
    const client: CheckinApiClient = {
      submitBatchSync,
      async submitOnlineScan(_accessToken, request) {
        seenRequests.push(request);
        return {
          status: 'accepted',
          message: 'Accepted',
          ticketId: '77777777-7777-4777-8777-777777777777',
          checkedInAt: '2026-07-01T12:00:01.000Z',
        };
      },
    };
    const workflow = new ScanWorkflow(
      client,
      async () => '88888888-8888-4888-8888-888888888888',
      () => new Date('2026-07-01T12:00:00.000Z'),
    );
    await workflow.initialize();

    const state = await workflow.submitDecodedPayload(
      'ticketbox:opaque:payload',
      activeAssignment,
      staffSession,
    );

    expect(state).toEqual({
      status: 'result',
      result: {
        status: 'accepted',
        message: 'Accepted',
        ticketId: '77777777-7777-4777-8777-777777777777',
        checkedInAt: '2026-07-01T12:00:01.000Z',
      },
    });
    expect(seenRequests).toEqual([
      {
        assignmentId: activeAssignment.assignmentId,
        concertId: activeAssignment.concertId,
        gate: activeAssignment.gate,
        qrPayload: 'ticketbox:opaque:payload',
        scannedAt: '2026-07-01T12:00:00.000Z',
        deviceId: '88888888-8888-4888-8888-888888888888',
      },
    ]);
  });

  it('ignores duplicate local decode events while one submission is in flight', async () => {
    const deferred = new Deferred<OnlineScanResult>();
    const seenRequests: OnlineScanRequest[] = [];
    const client: CheckinApiClient = {
      submitBatchSync,
      async submitOnlineScan(_accessToken, request) {
        seenRequests.push(request);
        return deferred.promise;
      },
    };
    const workflow = new ScanWorkflow(
      client,
      async () => '88888888-8888-4888-8888-888888888888',
      () => new Date('2026-07-01T12:00:00.000Z'),
    );
    await workflow.initialize();

    const firstSubmission = workflow.submitDecodedPayload(
      'first-payload',
      activeAssignment,
      staffSession,
    );
    const duplicateState = await workflow.submitDecodedPayload(
      'second-payload',
      activeAssignment,
      staffSession,
    );

    expect(duplicateState.status).toBe('submitting');
    expect(seenRequests).toHaveLength(1);
    expect(seenRequests[0].qrPayload).toBe('first-payload');

    deferred.resolve({ status: 'duplicate', message: 'Already checked in' });
    await firstSubmission;
  });

  it('surfaces unexpected client exceptions without queueing or accepting locally', async () => {
    const client: CheckinApiClient = {
      submitBatchSync,
      async submitOnlineScan() {
        throw new Error('Network unavailable');
      },
    };
    const workflow = new ScanWorkflow(
      client,
      async () => '88888888-8888-4888-8888-888888888888',
      () => new Date('2026-07-01T12:00:00.000Z'),
    );
    await workflow.initialize();

    const state = await workflow.submitDecodedPayload(
      'raw-payload',
      activeAssignment,
      staffSession,
    );

    expect(state).toEqual({
      status: 'recoverable-error',
      message: 'Network unavailable',
    });
  });

  it('forwards the raw decoded QR payload and leaves validity decisions to the API response', async () => {
    const rawPayload = '{"ticket":"not-validated-on-device","concert":"unknown"}';
    const seenRequests: OnlineScanRequest[] = [];
    const client: CheckinApiClient = {
      submitBatchSync,
      async submitOnlineScan(_accessToken, request) {
        seenRequests.push(request);
        return { status: 'invalid', message: 'Invalid QR token', reasonCode: 'INVALID_TICKET' };
      },
    };
    const workflow = new ScanWorkflow(
      client,
      async () => '88888888-8888-4888-8888-888888888888',
      () => new Date('2026-07-01T12:00:00.000Z'),
    );
    await workflow.initialize();

    const state = await workflow.submitDecodedPayload(rawPayload, activeAssignment, staffSession);

    expect(seenRequests[0].qrPayload).toBe(rawPayload);
    expect(state).toEqual({
      status: 'result',
      result: { status: 'invalid', message: 'Invalid QR token', reasonCode: 'INVALID_TICKET' },
    });
  });

  it('blocks submission when installation identity initialization fails', async () => {
    const submitOnlineScan = vi.fn(async () => {
      throw new Error('must not run');
    });
    const client: CheckinApiClient = { submitOnlineScan, submitBatchSync };
    const workflow = new ScanWorkflow(client, async () => {
      throw new Error('secure storage unavailable');
    });

    await workflow.initialize();
    const state = await workflow.submitDecodedPayload('raw', activeAssignment, staffSession);

    expect(state).toEqual({ status: 'recoverable-error', message: 'secure storage unavailable' });
    expect(submitOnlineScan).not.toHaveBeenCalled();
  });

  it('does not submit before installation initialization completes', async () => {
    const installationId = new Deferred<string>();
    const submitOnlineScan = vi.fn();
    const workflow = new ScanWorkflow(
      { submitOnlineScan, submitBatchSync },
      () => installationId.promise,
    );

    const initialization = workflow.initialize();
    const state = await workflow.submitDecodedPayload('raw', activeAssignment, staffSession);

    expect(state).toEqual({ status: 'initializing' });
    expect(submitOnlineScan).not.toHaveBeenCalled();
    installationId.resolve('88888888-8888-4888-8888-888888888888');
    await initialization;
  });

  it('allows initialization retry after failure and submits only after retry succeeds', async () => {
    let attempts = 0;
    const submitOnlineScan = vi.fn(async () => ({
      status: 'duplicate' as const,
      message: 'Already checked in',
    }));
    const workflow = new ScanWorkflow({ submitOnlineScan, submitBatchSync }, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('secure storage unavailable');
      return '88888888-8888-4888-8888-888888888888';
    });

    await expect(workflow.initialize()).resolves.toEqual({
      status: 'recoverable-error',
      message: 'secure storage unavailable',
    });
    await workflow.submitDecodedPayload('blocked', activeAssignment, staffSession);
    expect(submitOnlineScan).not.toHaveBeenCalled();

    await expect(workflow.initialize()).resolves.toEqual({ status: 'ready' });
    await workflow.submitDecodedPayload('allowed', activeAssignment, staffSession);
    expect(submitOnlineScan).toHaveBeenCalledOnce();
  });

  it('queues account-owned hashes while offline and tracks connectivity mode', async () => {
    const queue = new InMemoryOfflineScanQueue();
    const network = new FakeNetworkMonitor(false);
    const submitOnlineScan = vi.fn();
    const workflow = new ScanWorkflow(
      { submitOnlineScan, submitBatchSync },
      async () => 'device-1',
      () => new Date('2026-07-01T12:00:00.000Z'),
      queue,
      network,
      async () => 'a'.repeat(64),
      () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    await workflow.initialize();
    expect(workflow.mode).toBe('offline');

    const state = await workflow.submitDecodedPayload('raw-secret', activeAssignment, staffSession);
    expect(state).toEqual({
      status: 'result',
      result: expect.objectContaining({ status: 'queued' }),
    });
    expect(submitOnlineScan).not.toHaveBeenCalled();
    const queued = await queue.getPendingScanEvents(staffSession.profile.id, 100);
    expect(queued).toEqual([
      expect.objectContaining({
        localId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        staffUserId: staffSession.profile.id,
        qrPayloadHash: 'a'.repeat(64),
      }),
    ]);
    expect(JSON.stringify(queued)).not.toContain('raw-secret');

    network.setOnline(true);
    expect(workflow.mode).toBe('online');
    workflow.dispose();
  });

  it.each([
    ['network error', { status: 'transport-error' as const, message: 'offline' }],
    [
      'HTTP 5xx',
      { status: 'service-error' as const, httpStatus: 503, message: 'server unavailable' },
    ],
    ['unknown commit', { status: 'unknown-commit' as const, message: 'invalid response' }],
  ])('falls back to the queue after %s', async (_name, onlineResult) => {
    const queue = new InMemoryOfflineScanQueue();
    const workflow = new ScanWorkflow(
      {
        submitBatchSync,
        submitOnlineScan: vi.fn(async () => onlineResult),
      },
      async () => 'device-1',
      () => new Date('2026-07-01T12:00:00.000Z'),
      queue,
      new FakeNetworkMonitor(true),
      async () => 'b'.repeat(64),
      () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );
    await workflow.initialize();
    await expect(
      workflow.submitDecodedPayload('raw', activeAssignment, staffSession),
    ).resolves.toEqual({ status: 'result', result: expect.objectContaining({ status: 'queued' }) });
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(1);
  });

  it('does not enqueue authorization, HTTP 4xx, or completed business outcomes', async () => {
    const queue = new InMemoryOfflineScanQueue();
    const submitOnlineScan = vi
      .fn()
      .mockResolvedValueOnce({ status: 'unauthorized', httpStatus: 401, message: 'Login required' })
      .mockResolvedValueOnce({ status: 'request-error', httpStatus: 400, message: 'Invalid body' })
      .mockResolvedValueOnce({
        status: 'invalid',
        message: 'Invalid',
        reasonCode: 'INVALID_TICKET',
      });
    const workflow = new ScanWorkflow(
      { submitOnlineScan, submitBatchSync },
      async () => 'device-1',
      () => new Date('2026-07-01T12:00:00.000Z'),
      queue,
      new FakeNetworkMonitor(true),
      async () => 'c'.repeat(64),
      () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    );
    await workflow.initialize();
    await workflow.submitDecodedPayload('raw-1', activeAssignment, staffSession);
    workflow.reset();
    await workflow.submitDecodedPayload('raw-2', activeAssignment, staffSession);
    workflow.reset();
    await workflow.submitDecodedPayload('raw-3', activeAssignment, staffSession);
    await expect(queue.getPendingCount(staffSession.profile.id)).resolves.toBe(0);
  });

  it('does not report queued when persistence fails', async () => {
    const queue = new InMemoryOfflineScanQueue();
    queue.enqueue = vi.fn(async () => {
      throw new Error('SQLite unavailable');
    });
    const workflow = new ScanWorkflow(
      { submitOnlineScan: vi.fn(), submitBatchSync },
      async () => 'device-1',
      () => new Date('2026-07-01T12:00:00.000Z'),
      queue,
      new FakeNetworkMonitor(false),
      async () => 'd'.repeat(64),
      () => 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    );
    await workflow.initialize();
    await expect(
      workflow.submitDecodedPayload('raw', activeAssignment, staffSession),
    ).resolves.toEqual({ status: 'recoverable-error', message: 'SQLite unavailable' });
  });

  it('uses injected UUIDs across restart and identical timestamps', async () => {
    const queue = new InMemoryOfflineScanQueue();
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    const createWorkflow = (localId: string) =>
      new ScanWorkflow(
        { submitOnlineScan: vi.fn(), submitBatchSync },
        async () => 'same-device',
        () => new Date('2026-07-01T12:00:00.000Z'),
        queue,
        new FakeNetworkMonitor(false),
        async () => 'e'.repeat(64),
        () => localId,
      );

    const beforeRestart = createWorkflow(ids[0]);
    await beforeRestart.initialize();
    await beforeRestart.submitDecodedPayload('raw-1', activeAssignment, staffSession);
    beforeRestart.dispose();

    const afterRestart = createWorkflow(ids[1]);
    await afterRestart.initialize();
    await afterRestart.submitDecodedPayload('raw-2', activeAssignment, staffSession);

    const queued = await queue.getPendingScanEvents(staffSession.profile.id, 100);
    expect(queued.map(({ localId }) => localId)).toEqual(ids);
    expect(new Set(queued.map(({ localId }) => localId)).size).toBe(2);
  });
});
