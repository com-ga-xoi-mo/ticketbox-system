import { describe, expect, it } from 'vitest';

import type { CheckinApiClient, OnlineScanRequest, OnlineScanResult } from '../../api/checkin-mobile-api.types';
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
        return { status: 'accepted', message: 'Accepted', ticketId: 'ticket-1' };
      },
    };
    const workflow = new ScanWorkflow(client, () => 'device-1', () => new Date('2026-07-01T12:00:00.000Z'));

    const state = await workflow.submitDecodedPayload('ticketbox:opaque:payload', activeAssignment, staffSession);

    expect(state).toEqual({
      status: 'result',
      result: { status: 'accepted', message: 'Accepted', ticketId: 'ticket-1' },
    });
    expect(seenRequests).toEqual([
      {
        assignmentId: activeAssignment.assignmentId,
        concertId: activeAssignment.concertId,
        gate: activeAssignment.gate,
        qrPayload: 'ticketbox:opaque:payload',
        scannedAt: '2026-07-01T12:00:00.000Z',
        deviceId: 'device-1',
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
    const workflow = new ScanWorkflow(client, () => 'device-1', () => new Date('2026-07-01T12:00:00.000Z'));

    const firstSubmission = workflow.submitDecodedPayload('first-payload', activeAssignment, staffSession);
    const duplicateState = await workflow.submitDecodedPayload('second-payload', activeAssignment, staffSession);

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
    const workflow = new ScanWorkflow(client, () => 'device-1', () => new Date('2026-07-01T12:00:00.000Z'));

    const state = await workflow.submitDecodedPayload('raw-payload', activeAssignment, staffSession);

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
        return { status: 'invalid', message: 'Invalid QR token' };
      },
    };
    const workflow = new ScanWorkflow(client, () => 'device-1', () => new Date('2026-07-01T12:00:00.000Z'));

    const state = await workflow.submitDecodedPayload(rawPayload, activeAssignment, staffSession);

    expect(seenRequests[0].qrPayload).toBe(rawPayload);
    expect(state).toEqual({
      status: 'result',
      result: { status: 'invalid', message: 'Invalid QR token' },
    });
  });
});
