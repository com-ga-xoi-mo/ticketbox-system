import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpCheckinMobileApiClient, type FetchLike } from './http-checkin-mobile-api-client';

const staffId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';
const concertId = '33333333-3333-4333-8333-333333333333';
const ticketId = '44444444-4444-4444-8444-444444444444';
const timestamp = '2026-07-01T12:00:00.000Z';
const vipGuestId = '55555555-5555-4555-8555-555555555555';

function response(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe('HttpCheckinMobileApiClient', () => {
  afterEach(() => vi.useRealTimers());
  it('uses token-only login then loads and validates the bearer profile', async () => {
    const requests: Array<{ input: string; authorization: string | null }> = [];
    const payloads = [
      response(200, { accessToken: 'staff-token' }),
      response(200, {
        id: staffId,
        email: 'staff@ticketbox.test',
        displayName: 'Gate Staff',
        roles: ['CHECKIN_STAFF'],
      }),
    ];
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000/',
      fetchImpl: async (input, init) => {
        requests.push({ input, authorization: new Headers(init?.headers).get('authorization') });
        return payloads.shift()!;
      },
    });

    await expect(
      client.login({ email: 'staff@ticketbox.test', password: 'secret' }),
    ).resolves.toMatchObject({
      accessToken: 'staff-token',
      profile: { id: staffId, displayName: 'Gate Staff', roles: ['CHECKIN_STAFF'] },
    });
    expect(requests).toEqual([
      { input: 'http://localhost:3000/auth/login', authorization: null },
      { input: 'http://localhost:3000/me/profile', authorization: 'Bearer staff-token' },
    ]);
  });

  it('accepts raw assignment arrays including [] and rejects envelope responses', async () => {
    const makeClient = (payload: unknown) =>
      new HttpCheckinMobileApiClient({
        baseUrl: 'http://localhost:3000',
        fetchImpl: async () => response(200, payload),
      });

    await expect(makeClient([]).listStaffAssignments('token')).resolves.toEqual([]);
    await expect(makeClient({ assignments: [] }).listStaffAssignments('token')).rejects.toThrow(
      'Invalid response from /checkin/assignments',
    );
    await expect(
      makeClient([
        { assignmentId, concertId, concertTitle: 'Live', startsAt: timestamp, status: 'ACTIVE' },
      ]).listStaffAssignments('token'),
    ).resolves.toHaveLength(1);
  });

  it('parses valid business results and rejects invalid success payloads locally', async () => {
    const request = {
      assignmentId,
      concertId,
      qrPayload: 'raw',
      scannedAt: timestamp,
      deviceId: staffId,
    };
    const validClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () =>
        response(200, {
          status: 'accepted',
          message: 'Accepted',
          ticketId,
          checkedInAt: timestamp,
        }),
    });
    const invalidClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(200, { status: 'accepted', message: 'Accepted' }),
    });

    await expect(validClient.submitOnlineScan('token', request)).resolves.toMatchObject({
      status: 'accepted',
      ticketId,
    });
    await expect(invalidClient.submitOnlineScan('token', request)).resolves.toEqual({
      status: 'unknown-commit',
      message: 'Invalid response from /checkin/scan',
    });
  });

  it.each([401, 403])('classifies HTTP %s before parsing its body', async (status) => {
    const fetchImpl: FetchLike = async () =>
      response(status, { message: ['Unauthorized', 'Try login'] });
    const client = new HttpCheckinMobileApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });

    await expect(
      client.submitOnlineScan('token', {
        assignmentId,
        concertId,
        qrPayload: 'raw',
        scannedAt: timestamp,
        deviceId: staffId,
      }),
    ).resolves.toEqual({
      status: 'unauthorized',
      httpStatus: status,
      message: 'Unauthorized, Try login',
    });
  });

  it('classifies a non-JSON 401 by status before response parsing', async () => {
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => {
          throw new SyntaxError('not json');
        },
      }),
    });

    await expect(
      client.submitOnlineScan('expired', {
        assignmentId,
        concertId,
        qrPayload: 'raw',
        scannedAt: timestamp,
        deviceId: staffId,
      }),
    ).resolves.toEqual({ status: 'unauthorized', httpStatus: 401, message: 'Request failed' });
  });

  it('preserves transport, request, and service failure categories', async () => {
    const request = {
      assignmentId,
      concertId,
      qrPayload: 'raw',
      scannedAt: timestamp,
      deviceId: staffId,
    };
    const networkClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    const unavailableClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(503, { message: 'Service unavailable' }),
    });
    const requestErrorClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(400, { message: 'Invalid request' }),
    });

    await expect(networkClient.submitOnlineScan('token', request)).resolves.toMatchObject({
      status: 'transport-error',
    });
    await expect(unavailableClient.submitOnlineScan('token', request)).resolves.toMatchObject({
      status: 'service-error',
      httpStatus: 503,
    });
    await expect(requestErrorClient.submitOnlineScan('token', request)).resolves.toMatchObject({
      status: 'request-error',
      httpStatus: 400,
    });
  });

  it('submits and validates batch sync responses through the shared contract', async () => {
    const requests: Array<{ input: string; body: string | undefined }> = [];
    const batchEvent = {
      localId: 'local-1',
      assignmentId,
      concertId,
      qrPayloadHash: 'a'.repeat(64),
      scannedAt: timestamp,
      deviceId: 'device-1',
    };
    const request = { events: [batchEvent] };
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (input, init) => {
        requests.push({ input, body: init?.body as string | undefined });
        return response(201, {
          results: [{ localId: 'local-1', status: 'duplicate', message: 'Duplicate' }],
        });
      },
    });
    await expect(client.submitBatchSync('token', request)).resolves.toEqual({
      results: [{ localId: 'local-1', status: 'duplicate', message: 'Duplicate' }],
    });
    expect(requests).toEqual([
      { input: 'http://localhost:3000/checkin/sync', body: JSON.stringify(request) },
    ]);

    const invalid = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(201, [{ localId: 'local-1', status: 'accepted' }]),
    });
    await expect(invalid.submitBatchSync('token', request)).rejects.toThrow(
      'Invalid response from /checkin/sync',
    );
  });

  it.each([
    [{ status: 'found', guest: { id: vipGuestId, guestName: 'VIP', email: 'vip@x.test' } }],
    [{ status: 'not_found' }],
  ])('serializes an authenticated VIP lookup and parses the %s response', async (payload) => {
    const requests: Array<{ input: string; authorization: string | null; body: string }> = [];
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000/',
      fetchImpl: async (input, init) => {
        requests.push({
          input,
          authorization: new Headers(init?.headers).get('authorization'),
          body: init?.body as string,
        });
        return response(201, payload);
      },
    });
    const result = await client.lookupVipGuest('staff-token', {
      assignmentId,
      concertId,
      gate: ' Main Gate ',
      lookupType: 'email',
      value: ' vip@x.test ',
    });
    expect(result).toEqual(payload);
    expect(requests).toEqual([
      {
        input: 'http://localhost:3000/guest-list/lookup',
        authorization: 'Bearer staff-token',
        body: JSON.stringify({
          assignmentId,
          concertId,
          gate: 'Main Gate',
          lookupType: 'email',
          value: 'vip@x.test',
        }),
      },
    ]);
  });

  it.each([
    [400, 'request-error'],
    [403, 'unauthorized'],
    [503, 'service-error'],
  ] as const)('maps VIP HTTP %s to %s', async (status, expectedStatus) => {
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(status, { message: `error-${status}` }),
    });
    await expect(
      client.lookupVipGuest('token', {
        assignmentId,
        concertId,
        lookupType: 'external_ref',
        value: 'REF-1',
      }),
    ).resolves.toMatchObject({ status: expectedStatus, message: `error-${status}` });
  });

  it('returns request-error before transport for a request rejected by the shared schema', async () => {
    const fetchImpl = vi.fn();
    const client = new HttpCheckinMobileApiClient({ baseUrl: 'http://localhost:3000', fetchImpl });
    await expect(
      client.lookupVipGuest('token', {
        assignmentId: 'not-a-uuid',
        concertId,
        lookupType: 'email',
        value: '',
      }),
    ).resolves.toEqual({
      status: 'request-error',
      httpStatus: 400,
      message: 'Invalid VIP lookup request',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('distinguishes timeout, transport, and invalid VIP response failures', async () => {
    vi.useFakeTimers();
    const timeoutClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: () => new Promise(() => undefined),
    });
    const timeoutResult = timeoutClient.lookupVipGuest('token', {
      assignmentId,
      concertId,
      lookupType: 'phone',
      value: '0901234567',
    });
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(timeoutResult).resolves.toEqual({
      status: 'transport-error',
      message: 'Request timed out',
    });
    vi.useRealTimers();

    const transportClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    const invalidResponseClient = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async () => response(200, { status: 'found', guest: { id: 'bad' } }),
    });
    const request = { assignmentId, concertId, lookupType: 'email' as const, value: 'vip@x.test' };
    await expect(transportClient.lookupVipGuest('token', request)).resolves.toMatchObject({
      status: 'transport-error',
      message: 'offline',
    });
    await expect(invalidResponseClient.lookupVipGuest('token', request)).resolves.toEqual({
      status: 'invalid-response',
      message: 'Invalid response from /guest-list/lookup',
    });
  });
});
