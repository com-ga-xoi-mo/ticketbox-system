import { describe, expect, it } from 'vitest';

import {
  AudienceNotificationListResponseSchema,
  AudienceNotificationMarkAllReadResponseSchema,
  AudienceNotificationMarkReadResponseSchema,
  AudienceNotificationUnreadCountResponseSchema,
  BatchSyncEventResultSchema,
  BatchSyncRequestSchema,
  BatchSyncResponseSchema,
  CreateRefundRequestSchema,
  CreateSupportRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  OnlineScanRequestSchema,
  OnlineScanResponseSchema,
  OrderConfirmationResponseSchema,
  PublicConcertAvailabilityResponseSchema,
  PublicConcertDetailResponseSchema,
  PublicConcertListResponseSchema,
  RefundEligibilityResponseSchema,
  RefundRequestResponseSchema,
  StaffAssignmentsResponseSchema,
  StaffProfileResponseSchema,
  SupportRequestResponseSchema,
  TicketCacheDeltaResponseSchema,
  TicketCacheFullResponseSchema,
  TicketDownloadResponseSchema,
  TicketResendResponseSchema,
  VipLookupRequestSchema,
  VipLookupResponseSchema,
} from './index';

const assignmentId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const ticketId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const assetId = '55555555-5555-4555-8555-555555555555';
const seatingZoneId = '66666666-6666-4666-8666-666666666666';
const ticketTypeId = '77777777-7777-4777-8777-777777777777';
const timestamp = '2026-07-01T12:00:00.000Z';
const qrPayloadHash = 'a'.repeat(64);

describe('public concert catalog contracts', () => {
  const availabilitySummary = {
    totalAvailableQuantity: 120,
    minPriceVnd: 450000,
    maxPriceVnd: 1250000,
    ticketTypeCount: 2,
  };

  const posterAsset = {
    id: assetId,
    kind: 'POSTER',
    status: 'ACTIVE',
    publicUrl: 'https://cdn.ticketbox.test/poster.jpg',
    originalName: 'poster.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 2048,
  };

  const summary = {
    id: concertId,
    slug: 'summer-beats',
    title: 'Summer Beats',
    artistName: 'The Suns',
    venueName: 'TicketBox Arena',
    city: 'Ho Chi Minh City',
    startsAt: timestamp,
    endsAt: '2026-07-01T15:00:00.000Z',
    eventType: 'CONCERT',
    posterAsset,
    availabilitySummary,
  };

  const ticketType = {
    id: ticketTypeId,
    code: 'GA',
    name: 'General Admission',
    description: 'Standing zone',
    priceVnd: 450000,
    totalQuantity: 200,
    availableQuantity: 120,
    maxPerUser: 4,
    saleStartsAt: '2026-06-01T12:00:00.000Z',
    saleEndsAt: '2026-06-30T12:00:00.000Z',
    status: 'ACTIVE',
    zoneIds: [seatingZoneId],
  };

  it('accepts public concert list, detail, and availability responses', () => {
    expect(PublicConcertListResponseSchema.parse([summary])).toEqual([summary]);

    expect(
      PublicConcertDetailResponseSchema.parse({
        ...summary,
        description: 'A summer concert.',
        publishedArtistBio: 'The Suns are a live act.',
        venueAddress: '1 Nguyen Hue',
        seoTitle: null,
        seoDescription: null,
        seoImageUrl: null,
        seatingMapAsset: { ...posterAsset, kind: 'SEATING_MAP' },
        seatingZones: [
          {
            id: seatingZoneId,
            svgElementId: 'zone-ga',
            label: 'GA',
            color: '#00aaff',
            displayOrder: 1,
            status: 'ACTIVE',
          },
        ],
        ticketTypes: [ticketType],
        ticketTypeZoneMappings: [{ ticketTypeId, seatingZoneId }],
      }),
    ).toMatchObject({ slug: 'summer-beats', ticketTypes: [ticketType] });

    expect(
      PublicConcertAvailabilityResponseSchema.parse({
        concertId,
        slug: 'summer-beats',
        generatedAt: timestamp,
        ticketTypes: [
          {
            ticketTypeId,
            code: 'GA',
            name: 'General Admission',
            totalQuantity: 200,
            availableQuantity: 120,
            status: 'ACTIVE',
            saleStartsAt: '2026-06-01T12:00:00.000Z',
            saleEndsAt: '2026-06-30T12:00:00.000Z',
            zoneIds: [seatingZoneId],
          },
        ],
      }),
    ).toMatchObject({ concertId, ticketTypes: [{ ticketTypeId }] });
  });

  it('rejects malformed public catalog payloads', () => {
    expect(PublicConcertListResponseSchema.safeParse({ concerts: [summary] }).success).toBe(false);
    expect(PublicConcertListResponseSchema.safeParse([{ ...summary, startsAt: new Date() }]).success)
      .toBe(false);
    expect(
      PublicConcertDetailResponseSchema.safeParse({
        ...summary,
        description: null,
        publishedArtistBio: null,
        venueAddress: null,
        seatingMapAsset: null,
        seatingZones: [],
        ticketTypes: [{ ...ticketType, status: 'UNKNOWN' }],
        ticketTypeZoneMappings: [],
      }).success,
    ).toBe(false);
    expect(
      PublicConcertAvailabilityResponseSchema.safeParse({
        concertId,
        slug: 'summer-beats',
        generatedAt: timestamp,
        ticketTypes: [{ ticketTypeId, availableQuantity: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe('audience support and refund contracts', () => {
  const statusHistoryItem = {
    id: eventId,
    status: 'OPEN',
    note: null,
    createdAt: timestamp,
  };

  it('accepts support create and response payloads', () => {
    expect(
      CreateSupportRequestSchema.parse({
        orderId: assignmentId,
        category: 'ORDER_HELP',
        subject: 'Need order help',
        message: 'Please help me with this order.',
      }),
    ).toMatchObject({ category: 'ORDER_HELP' });

    expect(
      SupportRequestResponseSchema.safeParse({
        id: eventId,
        userId: assignmentId,
        orderId: assignmentId,
        ticketId: null,
        category: 'ORDER_HELP',
        status: 'OPEN',
        subject: 'Need order help',
        message: 'Please help me with this order.',
        createdAt: timestamp,
        updatedAt: timestamp,
        statusHistory: [statusHistoryItem],
      }).success,
    ).toBe(true);
  });

  it('rejects malformed support payloads', () => {
    expect(
      CreateSupportRequestSchema.safeParse({
        orderId: assignmentId,
        ticketId,
        category: 'ORDER_HELP',
        subject: 'Need order help',
        message: 'Please help me with this order.',
      }).success,
    ).toBe(false);
    expect(
      SupportRequestResponseSchema.safeParse({
        id: eventId,
        userId: assignmentId,
        category: 'UNKNOWN',
        status: 'OPEN',
        subject: 'Need order help',
        message: 'Please help me with this order.',
        createdAt: timestamp,
        updatedAt: timestamp,
        statusHistory: [],
      }).success,
    ).toBe(false);
  });

  it('accepts refund eligibility, create, and response payloads', () => {
    expect(
      RefundEligibilityResponseSchema.safeParse({
        eligible: true,
        reasonCode: 'ELIGIBLE',
        message: 'Eligible for refund request.',
        orderId: assignmentId,
        ticketId: null,
        refundableAmountVnd: 450000,
        refundableTicketCount: 1,
      }).success,
    ).toBe(true);

    expect(
      CreateRefundRequestSchema.parse({
        ticketId,
        reason: 'CANNOT_ATTEND',
        message: 'I cannot attend the event anymore.',
      }),
    ).toMatchObject({ ticketId, reason: 'CANNOT_ATTEND' });

    expect(
      RefundRequestResponseSchema.safeParse({
        id: eventId,
        userId: assignmentId,
        orderId: assignmentId,
        ticketId,
        status: 'REQUESTED',
        reason: 'CANNOT_ATTEND',
        message: 'I cannot attend the event anymore.',
        requestedAmountVnd: 450000,
        requestedTicketCount: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        statusHistory: [{ ...statusHistoryItem, status: 'REQUESTED' }],
      }).success,
    ).toBe(true);
  });

  it('rejects invalid refund boundaries', () => {
    expect(
      CreateRefundRequestSchema.safeParse({
        reason: 'CANNOT_ATTEND',
        message: 'I cannot attend the event anymore.',
      }).success,
    ).toBe(false);
    expect(
      RefundRequestResponseSchema.safeParse({
        id: eventId,
        userId: assignmentId,
        orderId: assignmentId,
        status: 'REFUNDED',
        reason: 'OTHER',
        createdAt: timestamp,
        updatedAt: timestamp,
        statusHistory: [],
      }).success,
    ).toBe(false);
  });
});

describe('audience notification and download contracts', () => {
  it('accepts notification inbox responses and read mutations', () => {
    expect(
      AudienceNotificationListResponseSchema.safeParse([
        {
          id: eventId,
          type: 'REFUND_UPDATE',
          subject: 'Refund update',
          body: 'Your refund request is under review.',
          actionUrl: '/account/support/refunds/1',
          resourceType: 'REFUND_REQUEST',
          resourceId: eventId,
          readAt: null,
          createdAt: timestamp,
          sentAt: timestamp,
        },
      ]).success,
    ).toBe(true);
    expect(
      AudienceNotificationUnreadCountResponseSchema.safeParse({ unreadCount: 2 }).success,
    ).toBe(true);
    expect(
      AudienceNotificationMarkReadResponseSchema.safeParse({ id: eventId, readAt: timestamp })
        .success,
    ).toBe(true);
    expect(
      AudienceNotificationMarkAllReadResponseSchema.safeParse({
        updatedCount: 2,
        readAt: timestamp,
      }).success,
    ).toBe(true);
  });

  it('rejects invalid notification payloads', () => {
    expect(
      AudienceNotificationUnreadCountResponseSchema.safeParse({ unreadCount: -1 }).success,
    ).toBe(false);
    expect(
      AudienceNotificationListResponseSchema.safeParse([
        {
          id: eventId,
          type: 'REFUND_UPDATE',
          body: 'Body',
          resourceType: 'BAD',
          createdAt: timestamp,
        },
      ]).success,
    ).toBe(false);
  });

  it('accepts resend, ticket download, and order confirmation payloads', () => {
    expect(
      TicketResendResponseSchema.safeParse({
        status: 'QUEUED',
        notificationId: eventId,
        cooldownUntil: null,
        message: 'Ticket email queued.',
      }).success,
    ).toBe(true);

    expect(
      TicketDownloadResponseSchema.safeParse({
        label: 'Ticket',
        ticket: {
          id: ticketId,
          ticketNumber: 'TB-1',
          status: 'ISSUED',
          ticketTypeName: 'GA',
          ticketTypeCode: 'GA',
          issuedAt: timestamp,
          qrPayload: 'ticket-token',
        },
        order: {
          id: assignmentId,
          orderNumber: 'ORD-1',
          status: 'PAID',
        },
        concert: {
          id: concertId,
          title: 'TicketBox Live',
          venueName: 'TicketBox Arena',
          startsAt: timestamp,
        },
        generatedAt: timestamp,
      }).success,
    ).toBe(true);

    expect(
      OrderConfirmationResponseSchema.safeParse({
        label: 'Purchase confirmation',
        order: {
          id: assignmentId,
          orderNumber: 'ORD-1',
          status: 'PAID',
          totalAmountVnd: 450000,
          paidAt: timestamp,
          createdAt: timestamp,
        },
        concert: {
          id: concertId,
          title: 'TicketBox Live',
          venueName: 'TicketBox Arena',
          startsAt: timestamp,
        },
        lineItems: [
          {
            ticketTypeId,
            ticketTypeName: 'GA',
            quantity: 1,
            unitPriceVnd: 450000,
            totalPriceVnd: 450000,
          },
        ],
        payment: {
          provider: 'VNPAY',
          completedAt: timestamp,
        },
        generatedAt: timestamp,
      }).success,
    ).toBe(true);
  });
});

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

  it('accepts a 1-to-100 event request with optional since and trims bounded identifiers', () => {
    expect(BatchSyncRequestSchema.parse({ events: [event] }).events[0]).toMatchObject({
      localId: 'local-1',
      gate: 'Main Gate',
      deviceId: 'installation-1',
    });
    expect(
      BatchSyncRequestSchema.safeParse({
        events: Array.from({ length: 100 }, (_, index) => ({ ...event, localId: `local-${index}` })),
      }).success,
    ).toBe(true);
    expect(
      BatchSyncRequestSchema.safeParse({ events: [event], since: timestamp }).success,
    ).toBe(true);
  });

  it('rejects invalid batch request boundaries and fields', () => {
    const invalidRequests: unknown[] = [
      {
        events: Array.from({ length: 101 }, (_, index) => ({ ...event, localId: `local-${index}` })),
      },
      { events: [event, { ...event, localId: 'local-1' }] },
      { events: [{ ...event, localId: '   ' }] },
      { events: [{ ...event, localId: 'x'.repeat(161) }] },
      { events: [{ ...event, qrPayloadHash: 'A'.repeat(64) }] },
      { events: [{ ...event, qrPayloadHash: 'a'.repeat(63) }] },
      { events: [{ ...event, gate: 'x'.repeat(121) }] },
      { events: [{ ...event, deviceId: 'x'.repeat(161) }] },
      { events: [{ ...event, assignmentId: undefined }] },
      { events: [{ ...event, extra: true }] },
      { events: [event], extra: true },
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
    expect(BatchSyncResponseSchema.safeParse({ results: [result] }).success).toBe(true);
  });

  it('accepts response with cacheUpdates and without', () => {
    const accepted = { localId: '1', status: 'accepted', message: 'OK', ticketId, checkedInAt: timestamp };
    expect(BatchSyncResponseSchema.safeParse({ results: [accepted] }).success).toBe(true);
    expect(
      BatchSyncResponseSchema.safeParse({
        results: [accepted],
        cacheUpdates: {
          upserted: [{ hash: qrPayloadHash, status: 'checked_in' }],
          voided: [],
          syncedAt: timestamp,
        },
      }).success,
    ).toBe(true);
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

describe('ticket cache contracts', () => {
  it('validates full cache response', () => {
    expect(
      TicketCacheFullResponseSchema.safeParse({
        entries: [{ hash: qrPayloadHash, status: 'valid' }],
        syncedAt: timestamp,
      }).success,
    ).toBe(true);
    expect(TicketCacheFullResponseSchema.safeParse({ entries: [], syncedAt: timestamp }).success).toBe(true);
  });

  it('validates delta cache response', () => {
    expect(
      TicketCacheDeltaResponseSchema.safeParse({
        upserted: [{ hash: qrPayloadHash, status: 'checked_in' }],
        voided: [qrPayloadHash],
        syncedAt: timestamp,
      }).success,
    ).toBe(true);
  });

  it('rejects invalid cache status and unknown fields', () => {
    expect(
      TicketCacheFullResponseSchema.safeParse({
        entries: [{ hash: qrPayloadHash, status: 'invalid_status' }],
        syncedAt: timestamp,
      }).success,
    ).toBe(false);
    expect(
      TicketCacheFullResponseSchema.safeParse({
        entries: [{ hash: qrPayloadHash, status: 'valid', extra: true }],
        syncedAt: timestamp,
      }).success,
    ).toBe(false);
    expect(
      TicketCacheDeltaResponseSchema.safeParse({
        upserted: [],
        voided: ['not-a-hash'],
        syncedAt: timestamp,
      }).success,
    ).toBe(false);
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
