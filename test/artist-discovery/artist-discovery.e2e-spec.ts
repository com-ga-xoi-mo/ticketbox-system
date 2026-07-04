import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const skipIfNoDB = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

describe('Artist Discovery API (E2E)', () => {
  let app: any;
  let baseUrl: string;
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true') {
      return;
    }
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../../apps/api/src/app.module');

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    const port = (app.getHttpServer() as Server).address();
    const portNum = typeof port === 'object' && port ? port.port : 3001;
    baseUrl = `http://localhost:${portNum}`;

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
    await prisma.$disconnect();
    await app?.close();
  });

  skipIfNoDB('GET /public/artists/top - should return top seeded artists', async () => {
    const res = await fetch(`${baseUrl}/public/artists/top?limit=3`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  skipIfNoDB('GET /public/artists/:slug - should return artist profile with timeline', async () => {
    const res = await fetch(`${baseUrl}/public/artists/anh-trai-say-hi`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('anh-trai-say-hi');
    expect(body.displayName).toBe('Anh Trai Say Hi');
  });

  skipIfNoDB('GET /admin/artists - requires admin token', async () => {
    const res = await fetch(`${baseUrl}/admin/artists`);
    expect(res.status).toBe(401);
  });

  skipIfNoDB('GET /admin/artists - returns paginated admin artist catalog', async () => {
    const res = await fetch(`${baseUrl}/admin/artists?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(body.total).toBeGreaterThan(0);
    expect(body.limit).toBe(10);
  });

  skipIfNoDB('POST /admin/artists - creates a new artist', async () => {
    const uniqueSlug = `test-artist-${Date.now()}`;
    const res = await fetch(`${baseUrl}/admin/artists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        slug: uniqueSlug,
        displayName: 'Test Artist',
        status: 'ACTIVE',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe(uniqueSlug);
    expect(body.displayName).toBe('Test Artist');
  });
});
