import { describe, expect, it } from 'vitest';

import { HttpCheckinMobileApiClient } from './http-checkin-mobile-api-client';

describe('HttpCheckinMobileApiClient', () => {
  it('adds the bearer token to authenticated assignment requests', async () => {
    const seenHeaders: string[] = [];
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000/',
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        seenHeaders.push(headers.get('authorization') ?? '');
        return {
          ok: true,
          status: 200,
          json: async () => [],
        };
      },
    });

    await client.listStaffAssignments('staff-token');

    expect(seenHeaders).toEqual(['Bearer staff-token']);
  });

  it('adds the bearer token to authenticated online scan requests', async () => {
    const seenHeaders: string[] = [];
    const client = new HttpCheckinMobileApiClient({
      baseUrl: 'http://localhost:3000',
      fetchImpl: async (_input, init) => {
        const headers = new Headers(init?.headers);
        seenHeaders.push(headers.get('authorization') ?? '');
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'accepted', message: 'Accepted' }),
        };
      },
    });

    await client.submitOnlineScan('staff-token', {
      assignmentId: 'assignment-1',
      concertId: 'concert-1',
      qrPayload: 'raw-payload',
      scannedAt: '2026-07-01T12:00:00.000Z',
      deviceId: 'device-1',
    });

    expect(seenHeaders).toEqual(['Bearer staff-token']);
  });
});
