/**
 * Public concert catalog E2E tests.
 *
 * Prerequisites: PostgreSQL must be running and migrations + seed must be applied.
 * Skip these tests when the database is unavailable (e.g. CI without services).
 */

import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const describeIfDB =
  process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? describe.skip : describe;

describeIfDB('Public Concert Catalog E2E', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /concerts returns upcoming published seeded concerts', async () => {
    const res = await fetch(`${baseUrl}/concerts`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ slug: string; availabilitySummary: unknown }>;
    expect(body.map((concert) => concert.slug)).toContain('anh-trai-say-hi-2026');
    expect(body[0]).toHaveProperty('availabilitySummary');
  });

  it('GET /concerts/:slug returns detail with zones, mappings, and public availability', async () => {
    const res = await fetch(`${baseUrl}/concerts/anh-trai-say-hi-2026`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      slug: string;
      seatingZones: unknown[];
      ticketTypes: Array<Record<string, unknown>>;
      ticketTypeZoneMappings: unknown[];
    };
    expect(body.slug).toBe('anh-trai-say-hi-2026');
    expect(body.seatingZones.length).toBeGreaterThan(0);
    expect(body.ticketTypes.length).toBeGreaterThan(0);
    expect(body.ticketTypeZoneMappings.length).toBeGreaterThan(0);
    expect(body.ticketTypes[0]).toHaveProperty('availableQuantity');
    expect(body.ticketTypes[0]).not.toHaveProperty('reservedQuantity');
    expect(body.ticketTypes[0]).not.toHaveProperty('soldQuantity');
  });

  it('GET /concerts/:slug/availability returns a compact availability snapshot', async () => {
    const res = await fetch(`${baseUrl}/concerts/anh-trai-say-hi-2026/availability`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      slug: string;
      generatedAt: string;
      ticketTypes: Array<{ availableQuantity: number }>;
    };
    expect(body.slug).toBe('anh-trai-say-hi-2026');
    expect(typeof body.generatedAt).toBe('string');
    expect(body.ticketTypes[0].availableQuantity).toBeGreaterThan(0);
  });

  it('GET /concerts/:slug returns 404 for missing or non-public concerts', async () => {
    const res = await fetch(`${baseUrl}/concerts/missing-concert`);

    expect(res.status).toBe(404);
  });
});
