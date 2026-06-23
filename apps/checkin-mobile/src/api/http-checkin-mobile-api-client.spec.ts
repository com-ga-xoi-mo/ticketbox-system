import { describe, expect, it } from 'vitest';

import { HttpCheckinMobileApiClient, type FetchLike } from './http-checkin-mobile-api-client';

const staffId = '11111111-1111-4111-8111-111111111111';
const assignmentId = '22222222-2222-4222-8222-222222222222';
const concertId = '33333333-3333-4333-8333-333333333333';
const ticketId = '44444444-4444-4444-8444-444444444444';
const timestamp = '2026-07-01T12:00:00.000Z';

function response(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe('HttpCheckinMobileApiClient', () => {
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
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (input, init) => {
        requests.push({ input, body: init?.body as string | undefined });
        return response(201, [{ localId: 'local-1', status: 'duplicate', message: 'Duplicate' }]);
      },
    });
    const request = [
      {
        localId: 'local-1',
        assignmentId,
        concertId,
        qrPayloadHash: 'a'.repeat(64),
        scannedAt: timestamp,
        deviceId: 'device-1',
      },
    ];
    await expect(client.submitBatchSync('token', request)).resolves.toEqual([
      { localId: 'local-1', status: 'duplicate', message: 'Duplicate' },
    ]);
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
});
