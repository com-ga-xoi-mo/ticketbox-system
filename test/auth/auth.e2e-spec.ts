/**
 * Auth E2E tests.
 *
 * These tests bootstrap the full NestJS application and run HTTP requests
 * against the register, login, and profile endpoints.
 *
 * Prerequisites: PostgreSQL must be running and migrations + seed must be applied.
 * Skip these tests when the database is unavailable (e.g., CI without services).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';

const skipIfNoDB =
  process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

describe('Auth E2E', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;
  let registeredToken: string;

  const testEmail = `e2e-auth-${Date.now()}@ticketbox.test`;
  const testPassword = 'StrongPass123!';
  const testDisplayName = 'E2E Test User';

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

    await app.listen(0); // random port
    const port = (app.getHttpServer() as Server).address();
    const portNum = typeof port === 'object' && port ? port.port : 3001;
    baseUrl = `http://localhost:${portNum}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // POST /auth/register
  // ---------------------------------------------------------------------------

  skipIfNoDB('10.1 POST /auth/register — happy path returns 201 and accessToken', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { accessToken: string };
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(10);
    registeredToken = body.accessToken;
  });

  skipIfNoDB('10.2 POST /auth/register — duplicate email returns 409', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      }),
    });

    expect(res.status).toBe(409);
  });

  skipIfNoDB('10.3 POST /auth/register — invalid payload returns 400', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
    });

    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------

  skipIfNoDB('10.4 POST /auth/login — valid credentials returns 200 and accessToken', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { accessToken: string };
    expect(typeof body.accessToken).toBe('string');
  });

  skipIfNoDB('10.5 POST /auth/login — wrong password returns 401', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });

    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // GET /me/profile
  // ---------------------------------------------------------------------------

  skipIfNoDB('10.6 GET /me/profile — with valid JWT returns 200 and user payload', async () => {
    // Ensure registeredToken is set (test 10.1 must have run)
    const token = registeredToken ?? '';

    const res = await fetch(`${baseUrl}/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; roles: string[] };
    expect(typeof body.id).toBe('string');
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.roles).toContain('AUDIENCE');
  });

  skipIfNoDB('10.7 GET /me/profile — without token returns 401', async () => {
    const res = await fetch(`${baseUrl}/me/profile`);
    expect(res.status).toBe(401);
  });
});
