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
  let organizerToken: string;
  let concertId: string;
  let assignmentId: string;
  let batchId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processor: any;
  beforeAll(async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { ValidationPipe } = await import('@nestjs/common');
    const { AppModule } = await import('../../apps/api/src/app.module');
    const { ProcessGuestListImportUseCase } =
      await import('../../packages/backend/src/guest-list-import/application/use-cases/process-guest-list-import.use-case');
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0);
    processor = app.get(ProcessGuestListImportUseCase);
    const address = (app.getHttpServer() as Server).address();
    baseUrl = `http://localhost:${typeof address === 'object' && address ? address.port : 3001}`;
    [staffToken, adminToken, audienceToken, organizerToken] = await Promise.all([
      login('staff@ticketbox.test'),
      login('admin@ticketbox.test'),
      login('audience@ticketbox.test'),
      login('organizer@ticketbox.test'),
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
    'rejects audience and ORGANIZER access to every Admin guest-list resource',
    async () => {
      const uploadBody = JSON.stringify({
        sourceName: 'unauthorized.csv',
        contentType: 'text/csv',
        contentBase64: Buffer.from(
          'guest_name,email,phone,external_ref,action\nVIP,vip@x.test,,,UPSERT',
        ).toString('base64'),
      });
      for (const token of [audienceToken, organizerToken]) {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const responses = await Promise.all([
          fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports`, {
            method: 'POST',
            headers,
            body: uploadBody,
          }),
          fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports`, { headers }),
          fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports/${batchId}`, {
            headers,
          }),
          fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports/${batchId}/report`, {
            headers,
          }),
        ]);
        expect(responses.map(({ status }) => status)).toEqual([403, 403, 403, 403]);
      }
    },
  );

  skipIfNoDB(
    'uploads, processes, reports, deduplicates, and exposes the imported VIP to assigned staff',
    async () => {
      const nonce = Date.now();
      const email = `http-flow-${nonce}@ticketbox.test`;
      const csv = [
        'guest_name,email,phone,external_ref,action',
        `HTTP Flow VIP,${email},,HTTP-${nonce},UPSERT`,
      ].join('\n');
      const created = await uploadCsv(`http-flow-${nonce}.csv`, csv);
      expect(created.status).toBe(201);
      const createdBody = (await created.json()) as {
        outcome: string;
        batch: { id: string; status: string; sourceStorageKey?: string; leaseOwner?: string };
      };
      expect(createdBody).toMatchObject({ outcome: 'CREATED', batch: { status: 'PENDING' } });
      expect(createdBody.batch).not.toHaveProperty('sourceStorageKey');
      expect(createdBody.batch).not.toHaveProperty('leaseOwner');

      const duplicate = await uploadCsv(`renamed-${nonce}.csv`, csv);
      expect(await duplicate.json()).toMatchObject({
        outcome: 'IDEMPOTENT_DUPLICATE',
        batch: { id: createdBody.batch.id },
      });

      await processor.execute(createdBody.batch.id);
      const detail = await adminGet(`imports/${createdBody.batch.id}`);
      expect(detail.status).toBe(200);
      expect(await detail.json()).toMatchObject({
        id: createdBody.batch.id,
        status: 'COMPLETED',
        reportAvailable: true,
        totalRows: 1,
        validRows: 1,
        importedRows: 1,
      });

      const report = await adminGet(`imports/${createdBody.batch.id}/report`);
      expect(report.status).toBe(200);
      expect(await report.json()).toMatchObject({
        batchId: createdBody.batch.id,
        summary: { totalRows: 1, importedRows: 1 },
        rows: [{ rowNumber: 2, disposition: 'IMPORTED', email }],
      });

      const found = await lookupVip({
        assignmentId,
        concertId,
        gate: 'Main Gate',
        lookupType: 'email',
        value: email,
      });
      expect(await found.json()).toMatchObject({
        status: 'found',
        guest: { guestName: 'HTTP Flow VIP', email },
      });
      const unknown = await lookupVip({
        assignmentId,
        concertId,
        gate: 'Main Gate',
        lookupType: 'external_ref',
        value: `UNKNOWN-${nonce}`,
      });
      expect(await unknown.json()).toEqual({ status: 'not_found' });
    },
    30_000,
  );

  skipIfNoDB('persists completed-with-errors row evidence through the public report', async () => {
    const nonce = Date.now();
    const csv = [
      'guest_name,email,phone,external_ref,action',
      `Valid VIP,partial-${nonce}@ticketbox.test,,,UPSERT`,
      `Invalid phone,,bad,PARTIAL-${nonce},UPSERT`,
    ].join('\n');
    const response = await uploadCsv(`partial-${nonce}.csv`, csv);
    const { batch } = (await response.json()) as { batch: { id: string } };
    await processor.execute(batch.id);
    const detail = await adminGet(`imports/${batch.id}`);
    expect(await detail.json()).toMatchObject({
      status: 'COMPLETED_WITH_ERRORS',
      reportAvailable: true,
      totalRows: 2,
      importedRows: 1,
      invalidRows: 1,
    });
    const report = await adminGet(`imports/${batch.id}/report`);
    expect(await report.json()).toMatchObject({
      summary: { totalRows: 2, importedRows: 1, invalidRows: 1 },
      rows: [
        { rowNumber: 2, disposition: 'IMPORTED' },
        {
          rowNumber: 3,
          disposition: 'INVALID',
          reasonCode: 'ROW_VALIDATION',
          reasonMessage: 'Invalid phone',
        },
      ],
    });
  });

  skipIfNoDB(
    'fails invalid headers atomically and returns a structured non-reportable error',
    async () => {
      const nonce = Date.now();
      const before = await prisma.guestListEntry.count({ where: { concertId } });
      const response = await uploadCsv(
        `invalid-header-${nonce}.csv`,
        `guest_name,email\nAtomic VIP,atomic-${nonce}@ticketbox.test`,
      );
      const { batch } = (await response.json()) as { batch: { id: string } };
      await processor.execute(batch.id);
      await expect(prisma.guestListEntry.count({ where: { concertId } })).resolves.toBe(before);
      const detail = await adminGet(`imports/${batch.id}`);
      expect(await detail.json()).toMatchObject({
        status: 'FAILED',
        reportAvailable: false,
        failureCode: 'INVALID_HEADER',
      });
      const report = await adminGet(`imports/${batch.id}/report`);
      expect(report.status).toBe(422);
      expect(await report.json()).toMatchObject({
        error: 'BATCH_NOT_COMPLETED',
        status: 'FAILED',
      });
    },
  );

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

  function uploadCsv(sourceName: string, csv: string) {
    return fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/imports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        sourceName,
        contentType: 'text/csv',
        contentBase64: Buffer.from(csv).toString('base64'),
      }),
    });
  }

  function adminGet(resource: string) {
    return fetch(`${baseUrl}/admin/concerts/${concertId}/guest-list/${resource}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  function lookupVip(body: object) {
    return fetch(`${baseUrl}/guest-list/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify(body),
    });
  }
});
