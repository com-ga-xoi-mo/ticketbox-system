import { describe, expect, it } from 'vitest';

import {
  BatchSyncEventResultSchema,
  BatchSyncRequestSchema,
  BatchSyncResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  OnlineScanRequestSchema,
  OnlineScanResponseSchema,
  StaffAssignmentsResponseSchema,
  StaffProfileResponseSchema,
  VipLookupRequestSchema,
  VipLookupResponseSchema,
} from './index';

const assignmentId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const ticketId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const timestamp = '2026-07-01T12:00:00.000Z';
const qrPayloadHash = 'a'.repeat(64);

describe('batch sync contracts', () => {
  const event = {
    localId: ' local-1 ',
    assignmentId,
    concertId,
    gate: ' Main Gate ',
    qrPayloadHash,
    scannedAt: timestamp,
    deviceId: ' installation-1 ',
  };

  it('accepts empty and 100-event requests and trims bounded identifiers', () => {
    expect(BatchSyncRequestSchema.parse([])).toEqual([]);
    expect(BatchSyncRequestSchema.parse([event])[0]).toMatchObject({
      localId: 'local-1',
      gate: 'Main Gate',
      deviceId: 'installation-1',
    });
    expect(
      BatchSyncRequestSchema.safeParse(
        Array.from({ length: 100 }, (_, index) => ({ ...event, localId: `local-${index}` })),
      ).success,
    ).toBe(true);
  });

  it('rejects invalid batch request boundaries and fields', () => {
    const invalidRequests: unknown[] = [
      Array.from({ length: 101 }, (_, index) => ({ ...event, localId: `local-${index}` })),
      [event, { ...event, localId: 'local-1' }],
      [{ ...event, localId: '   ' }],
      [{ ...event, localId: 'x'.repeat(161) }],
      [{ ...event, qrPayloadHash: 'A'.repeat(64) }],
      [{ ...event, qrPayloadHash: 'a'.repeat(63) }],
      [{ ...event, gate: 'x'.repeat(121) }],
      [{ ...event, deviceId: 'x'.repeat(161) }],
      [{ ...event, assignmentId: undefined }],
      [{ ...event, extra: true }],
    ];
    for (const candidate of invalidRequests) {
      expect(BatchSyncRequestSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it.each([
    { localId: '1', status: 'accepted', message: 'Accepted', ticketId, checkedInAt: timestamp },
    { localId: '2', status: 'duplicate', message: 'Duplicate' },
    { localId: '3', status: 'invalid', message: 'Invalid', reasonCode: 'INVALID_TICKET' },
    {
      localId: '4',
      status: 'conflict',
      message: 'Conflict',
      conflictReason: 'Accepted on another device',
    },
    {
      localId: '5',
      status: 'unassigned',
      message: 'Unassigned',
      reasonCode: 'REVOKED_ASSIGNMENT',
    },
  ])('accepts every strict event result variant', (result) => {
    expect(BatchSyncEventResultSchema.safeParse(result).success).toBe(true);
    expect(BatchSyncResponseSchema.safeParse([result]).success).toBe(true);
  });

  it.each([
    { localId: '1', status: 'accepted', message: 'Accepted', checkedInAt: timestamp },
    { localId: '2', status: 'conflict', message: 'Conflict' },
    { localId: '3', status: 'invalid', message: 'Invalid' },
    { localId: '4', status: 'unassigned', message: 'Unassigned' },
    { localId: '5', status: 'duplicate', message: 'Duplicate', extra: true },
  ])('rejects missing and unknown result fields', (result) => {
    expect(BatchSyncEventResultSchema.safeParse(result).success).toBe(false);
  });
});

describe('auth contracts', () => {
  it('accepts token-only login and the public profile', () => {
    expect(LoginRequestSchema.parse({ email: 'staff@ticketbox.test', password: 'secret' })).toEqual(
      {
        email: 'staff@ticketbox.test',
        password: 'secret',
      },
    );
    expect(LoginResponseSchema.parse({ accessToken: 'jwt' })).toEqual({ accessToken: 'jwt' });
    expect(
      StaffProfileResponseSchema.parse({
        id: assignmentId,
        email: 'staff@ticketbox.test',
        displayName: 'Gate Staff',
        roles: ['CHECKIN_STAFF'],
      }),
    ).toMatchObject({ roles: ['CHECKIN_STAFF'] });
  });

  it('rejects invalid and unknown auth fields', () => {
    expect(LoginRequestSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
    expect(LoginResponseSchema.safeParse({ accessToken: 'jwt', profile: {} }).success).toBe(false);
    expect(
      StaffProfileResponseSchema.safeParse({
        id: assignmentId,
        email: 'staff@ticketbox.test',
        displayName: 'Staff',
        roles: ['UNKNOWN'],
      }).success,
    ).toBe(false);
  });
});

describe('VIP lookup contracts', () => {
  it('validates strict lookup requests and response variants', () => {
    expect(
      VipLookupRequestSchema.parse({
        assignmentId,
        concertId,
        gate: ' Main Gate ',
        lookupType: 'email',
        value: ' VIP@Example.com ',
      }),
    ).toMatchObject({ gate: 'Main Gate', value: 'VIP@Example.com' });
    expect(
      VipLookupResponseSchema.safeParse({
        status: 'found',
        guest: { id: ticketId, guestName: 'VIP', email: 'vip@example.com' },
      }).success,
    ).toBe(true);
    expect(VipLookupResponseSchema.safeParse({ status: 'not_found' }).success).toBe(true);
  });
  it('rejects unknown lookup fields and invalid variants', () => {
    expect(
      VipLookupRequestSchema.safeParse({ assignmentId, concertId, lookupType: 'qr', value: 'x' })
        .success,
    ).toBe(false);
    expect(VipLookupResponseSchema.safeParse({ status: 'not_found', guest: {} }).success).toBe(
      false,
    );
  });
});

describe('assignment contracts', () => {
  const assignment = {
    assignmentId,
    concertId,
    concertTitle: 'TicketBox Live',
    gate: 'Main Gate',
    startsAt: timestamp,
    status: 'ACTIVE',
  };

  it('accepts a raw array and an empty array', () => {
    expect(StaffAssignmentsResponseSchema.parse([assignment])).toEqual([assignment]);
    expect(StaffAssignmentsResponseSchema.parse([])).toEqual([]);
  });

  it('rejects envelopes, invalid statuses, null and unknown fields', () => {
    expect(StaffAssignmentsResponseSchema.safeParse({ assignments: [assignment] }).success).toBe(
      false,
    );
    expect(
      StaffAssignmentsResponseSchema.safeParse([{ ...assignment, status: 'REVOKED' }]).success,
    ).toBe(false);
    expect(StaffAssignmentsResponseSchema.safeParse([{ ...assignment, gate: null }]).success).toBe(
      false,
    );
    expect(StaffAssignmentsResponseSchema.safeParse([{ ...assignment, extra: true }]).success).toBe(
      false,
    );
  });
});

describe('online scan contracts', () => {
  const request = {
    assignmentId,
    concertId,
    gate: ' Main Gate ',
    qrPayload: 'ticket-token',
    scannedAt: timestamp,
    deviceId: ' installation-1 ',
  };

  it('trims and accepts a bounded required installation identifier', () => {
    expect(OnlineScanRequestSchema.parse(request)).toMatchObject({
      gate: 'Main Gate',
      deviceId: 'installation-1',
    });
  });

  it.each([
    { ...request, deviceId: undefined },
    { ...request, deviceId: '   ' },
    { ...request, deviceId: 'x'.repeat(161) },
  ])('rejects missing, blank, or oversized device identifiers', (candidate) => {
    expect(OnlineScanRequestSchema.safeParse(candidate).success).toBe(false);
  });

  it.each([
    {
      status: 'accepted',
      message: 'Accepted',
      ticketId,
      checkedInAt: timestamp,
      checkinEventId: eventId,
    },
    { status: 'duplicate', message: 'Duplicate' },
    { status: 'invalid', message: 'Invalid', reasonCode: 'WRONG_CONCERT', ticketId },
    { status: 'unassigned', message: 'Unassigned', reasonCode: 'ASSIGNMENT_MISMATCH' },
  ])('accepts each valid status variant', (response) => {
    expect(OnlineScanResponseSchema.safeParse(response).success).toBe(true);
  });

  it.each([
    { status: 'accepted', message: 'Accepted', checkedInAt: timestamp },
    { status: 'accepted', message: 'Accepted', ticketId },
    { status: 'invalid', message: 'Invalid' },
    { status: 'unassigned', message: 'Unassigned' },
    { status: 'invalid', message: 'Invalid', reasonCode: 'ASSIGNMENT_MISMATCH' },
    { status: 'unassigned', message: 'Unassigned', reasonCode: 'INVALID_TICKET' },
    { status: 'duplicate', message: 'Duplicate', ticketId: null },
    {
      status: 'accepted',
      message: 'Accepted',
      ticketId,
      checkedInAt: timestamp,
      reasonCode: 'INVALID_TICKET',
    },
  ])('rejects incomplete, cross-outcome, null, or unknown response fields', (response) => {
    expect(OnlineScanResponseSchema.safeParse(response).success).toBe(false);
  });
});
