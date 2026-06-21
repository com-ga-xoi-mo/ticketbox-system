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
});

function hashQrPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}
