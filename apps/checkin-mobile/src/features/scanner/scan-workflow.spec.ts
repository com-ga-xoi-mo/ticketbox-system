import { describe, expect, it, vi } from 'vitest';

import type {
  CheckinApiClient,
  OnlineScanRequest,
  OnlineScanResult,
} from '../../api/checkin-mobile-api.types';
import { activeAssignment, staffSession } from '../../test/fixtures';
import { ScanWorkflow } from './scan-workflow';

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
  it('creates an online scan request and maps accepted results', async () => {
    const seenRequests: OnlineScanRequest[] = [];
    const client: CheckinApiClient = {
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

  it('does not mark network failures as accepted locally', async () => {
    const client: CheckinApiClient = {
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
      status: 'result',
      result: { status: 'network-error', message: 'Network unavailable' },
    });
  });

  it('forwards the raw decoded QR payload and leaves validity decisions to the API response', async () => {
    const rawPayload = '{"ticket":"not-validated-on-device","concert":"unknown"}';
    const seenRequests: OnlineScanRequest[] = [];
    const client: CheckinApiClient = {
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
    const client: CheckinApiClient = { submitOnlineScan };
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
    const workflow = new ScanWorkflow({ submitOnlineScan }, () => installationId.promise);

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
    const workflow = new ScanWorkflow({ submitOnlineScan }, async () => {
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
});
