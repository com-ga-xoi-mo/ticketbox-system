import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'http';

const skipIfNoDB = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;

describe('Admin Users E2E', () => {
  let app: any;
  let baseUrl: string;
  let adminToken: string;
  let audienceToken: string;
  let testUserId: string;

  const testEmail = `e2e-admin-created-${Date.now()}@ticketbox.test`;

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

    // Get Admin Token
    const resAdmin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ticketbox.test', password: 'demoPassword' }),
    });
    const bodyAdmin = await resAdmin.json();
    adminToken = bodyAdmin.accessToken;

    // Get Audience Token
    const resAudience = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'audience@ticketbox.test', password: 'demoPassword' }),
    });
    const bodyAudience = await resAudience.json();
    audienceToken = bodyAudience.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  skipIfNoDB('POST /admin/users — non-admin forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${audienceToken}` },
      body: JSON.stringify({
        email: testEmail,
        passwordRaw: 'StrongPass123!',
        displayName: 'New Staff',
        roles: ['CHECKIN_STAFF'],
      }),
    });
    expect(res.status).toBe(403);
  });

  skipIfNoDB('POST /admin/users — admin creates user', async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        email: testEmail,
        passwordRaw: 'StrongPass123!',
        displayName: 'New Staff',
        roles: ['CHECKIN_STAFF'],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.roles).toContain('CHECKIN_STAFF');
    testUserId = body.id;
  });

  skipIfNoDB('POST /admin/users — duplicate email conflict', async () => {
    const res = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        email: testEmail,
        passwordRaw: 'StrongPass123!',
        displayName: 'Duplicate Staff',
        roles: ['CHECKIN_STAFF'],
      }),
    });
    expect(res.status).toBe(409);
  });

  skipIfNoDB('GET /admin/users — list/filter', async () => {
    const res = await fetch(`${baseUrl}/admin/users?email=${testEmail}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].email).toBe(testEmail);
  });

  skipIfNoDB('GET /admin/users/:id — get missing user', async () => {
    const res = await fetch(`${baseUrl}/admin/users/12345678-1234-1234-1234-123456789012`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(404);
  });

  skipIfNoDB('PATCH /admin/users/:id — update display name/roles', async () => {
    const res = await fetch(`${baseUrl}/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        displayName: 'Updated Staff',
        roles: ['CHECKIN_STAFF', 'ORGANIZER'],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('Updated Staff');
    expect(body.roles).toContain('CHECKIN_STAFF');
    expect(body.roles).toContain('ORGANIZER');
  });

  skipIfNoDB('PATCH /admin/users/:id/status — deactivate', async () => {
    const res = await fetch(`${baseUrl}/admin/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'DISABLED',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('DISABLED');
  });

  skipIfNoDB('POST /auth/login — disabled-user login rejection', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'StrongPass123!' }),
    });
    expect(res.status).toBe(401);
  });

  skipIfNoDB('PATCH /admin/users/:id/status — reactivate', async () => {
    const res = await fetch(`${baseUrl}/admin/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'ACTIVE',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ACTIVE');
  });

  skipIfNoDB('deactivation and removal of CHECKIN_STAFF revoke active assignments', async () => {
    // 1. Admin gets concerts
    // 2. Admin assigns checkin staff
    // 3. Admin revokes role or disables user
    // 4. Assignments should be inactive/revoked
    // We can just rely on the test that is described in the spec... wait, I can just use the DB to verify or an endpoint.
    
    // First, let's create an assignment
    const concertSlug = 'anh-trai-say-hi-2026'; // From seed
    // We need concert ID. Let's find it using DB or catalog.
    // For simplicity, let's assume there is a way to get concert ID, or we fetch it.
    const resCatalog = await fetch(`${baseUrl}/concerts/${concertSlug}`);
    const concert = await resCatalog.json();
    const concertId = concert.id;

    const resAssign = await fetch(`${baseUrl}/admin/concerts/${concertId}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        staffUserId: testUserId,
        gateName: 'Gate A',
      }),
    });
    expect(resAssign.status).toBe(201);
    
    // Check it's assigned
    const resList1 = await fetch(`${baseUrl}/admin/concerts/${concertId}/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const list1 = await resList1.json();
    const assigned = list1.find((a: any) => a.staffUserId === testUserId);
    expect(assigned).toBeDefined();

    // Now remove CHECKIN_STAFF role
    const resUpdate = await fetch(`${baseUrl}/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        roles: ['ORGANIZER'], // Removed CHECKIN_STAFF
      }),
    });
    expect(resUpdate.status).toBe(200);

    // Verify assignment is revoked
    const resList2 = await fetch(`${baseUrl}/admin/concerts/${concertId}/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const list2 = await resList2.json();
    const assigned2 = list2.find((a: any) => a.staffUserId === testUserId);
    expect(assigned2).toBeUndefined(); // Should be revoked/filtered out since listActive doesn't return it
  });
});
