import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';

const skipIfNoDB =
  process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

describe('Concert Admin Management E2E', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;
  let organizerToken: string;
  let adminToken: string;
  let createdConcertId: string;

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

    // Get Organizer token
    const orgRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@ticketbox.test', password: 'demoPassword' }),
    });
    if (orgRes.status === 200) {
      const body = (await orgRes.json()) as { accessToken: string };
      organizerToken = body.accessToken;
    }

    // Get Admin token
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ticketbox.test', password: 'demoPassword' }),
    });
    if (adminRes.status === 200) {
      const body = (await adminRes.json()) as { accessToken: string };
      adminToken = body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  skipIfNoDB('7.5 POST /organizer/concerts — unauthenticated returns 401', async () => {
    const res = await fetch(`${baseUrl}/organizer/concerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'e2e-concert',
        title: 'E2E Concert',
        artistName: 'E2E Artist',
        venueName: 'E2E Venue',
        city: 'Ha Noi',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      }),
    });
    expect(res.status).toBe(401);
  });

  skipIfNoDB('7.5 POST /organizer/concerts — organizer token returns 201', async () => {
    const uniqueSlug = `e2e-concert-${Date.now()}`;
    const res = await fetch(`${baseUrl}/organizer/concerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        slug: uniqueSlug,
        title: 'E2E Concert',
        artistName: 'E2E Artist',
        venueName: 'E2E Venue',
        city: 'Ha Noi',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; slug: string };
    expect(body.slug).toBe(uniqueSlug);
    createdConcertId = body.id;
  });

  skipIfNoDB('8.5 POST /organizer/concerts/:id/ticket-types — invalid price returns 400', async () => {
    const res = await fetch(`${baseUrl}/organizer/concerts/${createdConcertId}/ticket-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        code: 'VIP',
        name: 'VIP Class',
        priceVnd: -100, // Invalid
        totalQuantity: 100,
        saleStartsAt: new Date().toISOString(),
        saleEndsAt: new Date(Date.now() + 86400000).toISOString(),
        maxPerUser: 4,
      }),
    });
    expect(res.status).toBe(400);
  });

  skipIfNoDB('8.5 POST /organizer/concerts/:id/ticket-types — duplicate code returns 409', async () => {
    // Create first ticket type (success)
    const res1 = await fetch(`${baseUrl}/organizer/concerts/${createdConcertId}/ticket-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        code: 'VIP',
        name: 'VIP Class',
        priceVnd: 500000,
        totalQuantity: 100,
        saleStartsAt: new Date().toISOString(),
        saleEndsAt: new Date(Date.now() + 86400000).toISOString(),
        maxPerUser: 4,
      }),
    });
    expect(res1.status).toBe(201);

    // Attempt second with same code
    const res2 = await fetch(`${baseUrl}/organizer/concerts/${createdConcertId}/ticket-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        code: 'VIP',
        name: 'VIP Second Attempt',
        priceVnd: 600000,
        totalQuantity: 50,
        saleStartsAt: new Date().toISOString(),
        saleEndsAt: new Date(Date.now() + 86400000).toISOString(),
        maxPerUser: 4,
      }),
    });
    expect(res2.status).toBe(409);
  });

  skipIfNoDB('admin can update concert regardless of ownership', async () => {
    const res = await fetch(`${baseUrl}/admin/concerts/${createdConcertId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Admin Overridden Title',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe('Admin Overridden Title');
  });
});
