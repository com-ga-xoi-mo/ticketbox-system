import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { OrderStatus, PrismaClient, TicketStatus } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const skipIfNoDB = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

const prisma = new PrismaClient();

describe('Check-in API E2E', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;
  let staffToken: string;
  let audienceToken: string;
  let concertId: string;
  let assignmentId: string;
  let ticketId: string;
  let qrPayload: string;
  let audienceId: string;
  let ticketTypeId: string;

  beforeAll(async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { AppModule } = await import('../../apps/api/src/app.module');

    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.listen(0);
    const port = (app.getHttpServer() as Server).address();
    const portNum = typeof port === 'object' && port ? port.port : 3001;
    baseUrl = `http://localhost:${portNum}`;

    staffToken = await login('staff@ticketbox.test');
    audienceToken = await login('audience@ticketbox.test');

    const concert = await prisma.concert.findFirstOrThrow({
      where: { slug: 'anh-trai-say-hi-2026' },
      include: {
        ticketTypes: true,
        checkinStaff: {
          where: { status: 'ACTIVE', gateName: 'Main Gate' },
        },
      },
    });
    concertId = concert.id;
    assignmentId = concert.checkinStaff[0].id;

    const audience = await prisma.user.findUniqueOrThrow({
      where: { email: 'audience@ticketbox.test' },
    });
    const ticketType = concert.ticketTypes[0];
    audienceId = audience.id;
    ticketTypeId = ticketType.id;
    const order = await prisma.order.create({
      data: {
        orderNumber: `E2E-CHECKIN-${Date.now()}`,
        userId: audience.id,
        concertId,
        status: OrderStatus.PAID,
        totalAmountVnd: ticketType.priceVnd,
        paidAt: new Date(),
      },
    });
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        ticketTypeId: ticketType.id,
        quantity: 1,
        unitPriceVnd: ticketType.priceVnd,
        totalPriceVnd: ticketType.priceVnd,
      },
    });

    qrPayload = `e2e-checkin-${Date.now()}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `E2E-${Date.now()}`,
        orderId: order.id,
        orderItemId: orderItem.id,
        userId: audience.id,
        concertId,
        ticketTypeId: ticketType.id,
        qrTokenHash: hashQrPayload(qrPayload),
        status: TicketStatus.ISSUED,
      },
    });
    ticketId = ticket.id;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  skipIfNoDB('rejects missing bearer token with 401', async () => {
    const res = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeScanBody()),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { statusCode: number; message: string };
    expect(body.statusCode).toBe(401);
  });

  skipIfNoDB('rejects non-CHECKIN_STAFF users with 403', async () => {
    const res = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${audienceToken}`,
      },
      body: JSON.stringify(makeScanBody()),
    });

    expect(res.status).toBe(403);
  });

  skipIfNoDB('protects POST /checkin/sync with 401 and 403', async () => {
    const body = JSON.stringify([]);
    const unauthorized = await fetch(`${baseUrl}/checkin/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(unauthorized.status).toBe(401);

    const forbidden = await fetch(`${baseUrl}/checkin/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${audienceToken}` },
      body,
    });
    expect(forbidden.status).toBe(403);
  });

  skipIfNoDB('accepts empty batches and rejects 101 or duplicate local IDs without side effects', async () => {
    const empty = await postSync([]);
    expect(empty.status).toBe(201);
    await expect(empty.json()).resolves.toEqual([]);

    const candidate = makeSyncEvent({ qrPayloadHash: 'a'.repeat(64) });
    const before = await prisma.checkinEvent.count();
    const duplicateIds = await postSync([candidate, candidate]);
    expect(duplicateIds.status).toBe(400);
    const oversized = await postSync(
      Array.from({ length: 101 }, (_, index) => ({ ...candidate, localId: `bulk-${index}` })),
    );
    expect(oversized.status).toBe(400);
    await expect(prisma.checkinEvent.count()).resolves.toBe(before);
  });

  skipIfNoDB('accepts a structurally valid 100-event batch', async () => {
    const response = await postSync(
      Array.from({ length: 100 }, (_, index) =>
        makeSyncEvent({
          localId: `valid-100-${Date.now()}-${index}`,
          qrPayloadHash: hashQrPayload(`unknown-ticket-${index}`),
        }),
      ),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as Array<{ status: string }>;
    expect(body).toHaveLength(100);
    expect(body.every(({ status }) => status === 'invalid')).toBe(true);
  });

  skipIfNoDB('returns 5xx for an unexpected persistence failure instead of a business result', async () => {
    const response = await postSync([
      makeSyncEvent({
        localId: `infra-${Date.now()}`,
        concertId: '99999999-9999-4999-8999-999999999999',
        qrPayloadHash: 'e'.repeat(64),
      }),
    ]);
    expect(response.status).toBeGreaterThanOrEqual(500);
  });

  skipIfNoDB('processes mixed outcomes and exact replay deterministically', async () => {
    const fresh = await createTicket('mixed');
    const acceptedEvent = makeSyncEvent({
      localId: `accepted-${Date.now()}`,
      qrPayloadHash: hashQrPayload(fresh.qrPayload),
    });
    const response = await postSync([
      acceptedEvent,
      makeSyncEvent({ localId: `invalid-${Date.now()}`, qrPayloadHash: 'f'.repeat(64) }),
    ]);
    expect(response.status).toBe(201);
    const body = (await response.json()) as Array<{ status: string }>;
    expect(body.map(({ status }) => status)).toEqual(['accepted', 'invalid']);

    const replay = await postSync([acceptedEvent]);
    expect(replay.status).toBe(201);
    await expect(replay.json()).resolves.toEqual([expect.objectContaining({ status: 'accepted' })]);
    await expect(
      prisma.checkinEvent.count({
        where: { deviceId: acceptedEvent.deviceId, offlineEventId: acceptedEvent.localId },
      }),
    ).resolves.toBe(1);
  });

  skipIfNoDB('classifies same-device duplicate and cross-device conflict', async () => {
    const fresh = await createTicket('conflict');
    const hash = hashQrPayload(fresh.qrPayload);
    const first = makeSyncEvent({ localId: `first-${Date.now()}`, qrPayloadHash: hash });
    expect((await postSync([first])).status).toBe(201);

    const sameDevice = await postSync([
      makeSyncEvent({ localId: `same-${Date.now()}`, qrPayloadHash: hash }),
    ]);
    await expect(sameDevice.json()).resolves.toEqual([
      expect.objectContaining({ status: 'duplicate' }),
    ]);

    const otherDevice = await postSync([
      makeSyncEvent({
        localId: `other-${Date.now()}`,
        qrPayloadHash: hash,
        deviceId: 'other-device',
      }),
    ]);
    await expect(otherDevice.json()).resolves.toEqual([
      expect.objectContaining({ status: 'conflict' }),
    ]);
  });

  skipIfNoDB('allows exactly one winner across concurrent online/offline acceptance', async () => {
    const fresh = await createTicket('race');
    const [online, offline] = await Promise.all([
      fetch(`${baseUrl}/checkin/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify(makeScanBody({ qrPayload: fresh.qrPayload, deviceId: 'online-race' })),
      }),
      postSync([
        makeSyncEvent({
          localId: `race-${Date.now()}`,
          qrPayloadHash: hashQrPayload(fresh.qrPayload),
          deviceId: 'offline-race',
          scannedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
        }),
      ]),
    ]);
    const onlineBody = (await online.json()) as { status: string };
    const offlineBody = (await offline.json()) as Array<{ status: string }>;
    expect([onlineBody.status, offlineBody[0].status].filter((status) => status === 'accepted')).toHaveLength(1);
    await expect(
      prisma.checkinEvent.count({ where: { ticketId: fresh.ticketId, result: 'ACCEPTED' } }),
    ).resolves.toBe(1);
    await expect(prisma.ticket.findUniqueOrThrow({ where: { id: fresh.ticketId } })).resolves.toMatchObject({
      status: TicketStatus.CHECKED_IN,
    });
  });

  skipIfNoDB('returns unassigned for staff without a matching gate assignment', async () => {
    const res = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(makeScanBody({ gate: `Unassigned Gate ${Date.now()}` })),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { status: string; reasonCode: string };
    expect(body).toMatchObject({
      status: 'unassigned',
      reasonCode: 'ASSIGNMENT_MISMATCH',
    });
  });

  skipIfNoDB('lists only the authenticated staff active assignments as a raw array', async () => {
    const res = await fetch(`${baseUrl}/checkin/assignments`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      assignmentId: string;
      concertId: string;
      status: string;
    }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assignmentId, concertId, status: 'ACTIVE' }),
      ]),
    );
  });

  skipIfNoDB.each([
    ['missing', undefined],
    ['blank', '   '],
    ['oversized', 'x'.repeat(161)],
  ])('rejects %s deviceId with 400 and no check-in side effects', async (_name, deviceId) => {
    const before = await prisma.checkinEvent.count({ where: { ticketId } });
    const body: Record<string, unknown> = makeScanBody();
    if (deviceId === undefined) delete body.deviceId;
    else body.deviceId = deviceId;

    const res = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    await expect(prisma.checkinEvent.count({ where: { ticketId } })).resolves.toBe(before);
  });

  skipIfNoDB('accepts a valid unused ticket and rejects repeated scans as duplicate', async () => {
    const accepted = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(makeScanBody()),
    });

    expect(accepted.status).toBe(201);
    const acceptedBody = (await accepted.json()) as {
      status: string;
      ticketId: string;
      checkinEventId: string;
      checkedInAt: string;
    };
    expect(acceptedBody).toMatchObject({
      status: 'accepted',
      ticketId,
    });
    expect(new Date(acceptedBody.checkedInAt).toISOString()).toBe(acceptedBody.checkedInAt);

    const duplicate = await fetch(`${baseUrl}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify(makeScanBody()),
    });

    expect(duplicate.status).toBe(201);
    const duplicateBody = (await duplicate.json()) as { status: string; ticketId: string };
    expect(duplicateBody).toMatchObject({
      status: 'duplicate',
      ticketId,
    });
  });

  async function login(email: string): Promise<string> {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'demoPassword' }),
    });
    if (res.status !== 200) {
      throw new Error(`Unable to login ${email}; seed data may be missing`);
    }
    const body = (await res.json()) as { accessToken: string };
    return body.accessToken;
  }

  function makeScanBody(overrides: Record<string, unknown> = {}) {
    return {
      assignmentId,
      concertId,
      gate: 'Main Gate',
      qrPayload,
      scannedAt: new Date().toISOString(),
      deviceId: 'e2e-device',
      ...overrides,
    };
  }

  function makeSyncEvent(overrides: Record<string, unknown> = {}) {
    return {
      localId: `local-${Date.now()}`,
      assignmentId,
      concertId,
      gate: 'Main Gate',
      qrPayloadHash: hashQrPayload(qrPayload),
      scannedAt: new Date().toISOString(),
      deviceId: 'e2e-offline-device',
      ...overrides,
    };
  }

  function postSync(events: unknown[]) {
    return fetch(`${baseUrl}/checkin/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify(events),
    });
  }

  async function createTicket(label: string): Promise<{ ticketId: string; qrPayload: string }> {
    const ticketType = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketTypeId } });
    const nonce = `${label}-${Date.now()}-${Math.random()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: `E2E-${nonce}`,
        userId: audienceId,
        concertId,
        status: OrderStatus.PAID,
        totalAmountVnd: ticketType.priceVnd,
        paidAt: new Date(),
      },
    });
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        ticketTypeId,
        quantity: 1,
        unitPriceVnd: ticketType.priceVnd,
        totalPriceVnd: ticketType.priceVnd,
      },
    });
    const payload = `e2e-${nonce}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `E2E-TICKET-${nonce}`,
        orderId: order.id,
        orderItemId: item.id,
        userId: audienceId,
        concertId,
        ticketTypeId,
        qrTokenHash: hashQrPayload(payload),
        status: TicketStatus.ISSUED,
      },
    });
    return { ticketId: ticket.id, qrPayload: payload };
  }
});

function hashQrPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}
