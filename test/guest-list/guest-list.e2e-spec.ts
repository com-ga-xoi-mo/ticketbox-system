import type { Server } from 'node:http';
import { GuestListBatchStatus, GuestListEntryStatus, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const skipIfNoDB = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;
const prisma = new PrismaClient();

describe('Guest-list API E2E', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;
  let staffToken: string;
  let adminToken: string;
  let audienceToken: string;
  let concertId: string;
  let assignmentId: string;
  let batchId: string;
  beforeAll(async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { AppModule } = await import('../../apps/api/src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0);
    const address = (app.getHttpServer() as Server).address();
    baseUrl = `http://localhost:${typeof address === 'object' && address ? address.port : 3001}`;
    [staffToken, adminToken, audienceToken] = await Promise.all([
      login('staff@ticketbox.test'),
      login('admin@ticketbox.test'),
      login('audience@ticketbox.test'),
    ]);
    const concert = await prisma.concert.findFirstOrThrow({
      where: { slug: 'anh-trai-say-hi-2026' },
      include: { checkinStaff: { where: { status: 'ACTIVE', gateName: 'Main Gate' } } },
    });
    concertId = concert.id;
    assignmentId = concert.checkinStaff[0].id;
    const batch = await prisma.guestListBatch.create({
      data: {
        concertId,
        sourceName: `e2e-${Date.now()}.csv`,
        checksum: `${Date.now().toString(16).padStart(64, '0')}`.slice(-64),
        importSequence:
          (
            await prisma.guestListBatch.aggregate({
              where: { concertId },
              _max: { importSequence: true },
            })
          )._max.importSequence! + 1,
        status: GuestListBatchStatus.COMPLETED,
      },
    });
    batchId = batch.id;
    const guestEmail = `e2e-vip-${Date.now()}@ticketbox.test`;
    await prisma.guestListEntry.create({
      data: {
        concertId,
        latestBatchId: batch.id,
        guestName: 'E2E VIP',
        email: guestEmail,
        normalizedEmail: guestEmail,
        externalRef: `e2e-ref-${Date.now()}`,
        status: GuestListEntryStatus.ACTIVE,
      },
    });
  }, 60_000);
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  skipIfNoDB('authorizes Admin batch inspection and rejects audience users', async () => {
    expect(
      (
        await fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports`, {
          headers: { Authorization: `Bearer ${audienceToken}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports/${batchId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(200);
  });

  skipIfNoDB(
    'finds active VIPs only with the exact active same-concert gate assignment',
    async () => {
      const guest = await prisma.guestListEntry.findFirstOrThrow({
        where: { latestBatchId: batchId },
      });
      const lookup = (body: object) =>
        fetch(`${baseUrl}/guest-list/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify(body),
        });
      const found = await lookup({
        assignmentId,
        concertId,
        gate: 'Main Gate',
        lookupType: 'email',
        value: guest.email,
      });
      expect(found.status).toBe(201);
      expect(await found.json()).toMatchObject({
        status: 'found',
        guest: { guestName: 'E2E VIP' },
      });
      expect(
        (
          await lookup({
            assignmentId: '11111111-1111-4111-8111-111111111111',
            concertId,
            gate: 'Main Gate',
            lookupType: 'email',
            value: guest.email,
          })
        ).status,
      ).toBe(403);
      await prisma.guestListEntry.update({
        where: { id: guest.id },
        data: { status: GuestListEntryStatus.CANCELLED, cancelledAt: new Date() },
      });
      const cancelled = await lookup({
        assignmentId,
        concertId,
        gate: 'Main Gate',
        lookupType: 'email',
        value: guest.email,
      });
      expect(await cancelled.json()).toEqual({ status: 'not_found' });
    },
  );

  async function login(email: string) {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'demoPassword' }),
    });
    if (!response.ok) throw new Error(`Unable to login ${email}`);
    return ((await response.json()) as { accessToken: string }).accessToken;
  }
});
