import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from '../../apps/api/src/app.module';
import { PrismaService } from '../../packages/backend/src/platform/database/prisma.service';
import { GOOGLE_IDENTITY_VERIFIER } from '../../packages/backend/src/identity/domain/ports/google-identity-verifier.port';

const skipDatabase = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true';
const describeWithDatabase = skipDatabase ? describe.skip : describe;

describeWithDatabase('Audience Google authentication E2E', () => {
  let app: any;
  let prisma: PrismaService;
  let baseUrl: string;
  const nonce = Date.now();
  const email = `google-e2e-${nonce}@ticketbox.test`;
  const verifier = {
    identity: {
      subject: `google-sub-${nonce}`,
      email,
      displayName: 'Google E2E User',
      pictureUrl: 'https://lh3.googleusercontent.com/e2e-avatar',
    },
    async verify() {
      return this.identity;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GOOGLE_IDENTITY_VERIFIER)
      .useValue(verifier)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
    const address = app.getHttpServer().address();
    baseUrl = `http://localhost:${typeof address === 'object' && address ? address.port : 3001}`;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { normalizedEmail: email } });
    await app?.close();
  });

  it('provisions an OAuth-only audience user and returns an audience JWT', async () => {
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'fake-verified-by-test-adapter' }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { accessToken: string };
    const payload = JSON.parse(Buffer.from(body.accessToken.split('.')[1], 'base64url').toString()) as {
      sub: string;
      roles: string[];
    };
    expect(payload.roles).toEqual(['AUDIENCE']);

    const user = await prisma.user.findUnique({
      where: { normalizedEmail: email },
      include: { authIdentities: true, roles: { include: { role: true } } },
    });
    expect(user?.passwordHash).toBeNull();
    expect(payload.sub).toBe(user?.id);
    expect(user?.authIdentities).toHaveLength(1);
    expect(user?.roles.map((entry) => entry.role.code)).toEqual(['AUDIENCE']);

    const profileResponse = await fetch(`${baseUrl}/me/profile`, {
      headers: { Authorization: `Bearer ${body.accessToken}` },
    });
    expect(await profileResponse.json()).toMatchObject({
      hasPassword: false,
      authProviders: ['GOOGLE'],
      externalAvatarUrl: verifier.identity.pictureUrl,
    });

    const passwordLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'not-a-real-password' }),
    });
    expect(passwordLogin.status).toBe(401);
  });

  it('rejects a disabled linked user without creating a replacement', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } });
    await prisma.user.update({ where: { id: user.id }, data: { status: 'DISABLED' } });
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'disabled' }),
    });
    expect(response.status).toBe(401);
    expect(await prisma.user.count({ where: { normalizedEmail: email } })).toBe(1);
    await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  });

  it('rejects a linked user without AUDIENCE', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } });
    const audienceRole = await prisma.role.findUniqueOrThrow({ where: { code: 'AUDIENCE' } });
    await prisma.userRole.delete({ where: { userId_roleId: { userId: user.id, roleId: audienceRole.id } } });
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'no-audience' }),
    });
    expect(response.status).toBe(401);
    await prisma.userRole.create({ data: { userId: user.id, roleId: audienceRole.id } });
  });

  it('keeps a returning multi-role user scoped to AUDIENCE', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'returning' }),
    });
    const body = (await response.json()) as { accessToken: string };
    const payload = JSON.parse(Buffer.from(body.accessToken.split('.')[1], 'base64url').toString()) as { roles: string[] };
    expect(payload.roles).toEqual(['AUDIENCE']);
  });

  it('rejects a different Google subject for an existing canonical email', async () => {
    const beforeUsers = await prisma.user.count({ where: { normalizedEmail: email } });
    verifier.identity = { ...verifier.identity, subject: `other-sub-${nonce}`, email: ` ${email.toUpperCase()} ` };
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'collision' }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'ACCOUNT_LINK_REQUIRED' });
    expect(await prisma.user.count({ where: { normalizedEmail: email } })).toBe(beforeUsers);
  });
});
