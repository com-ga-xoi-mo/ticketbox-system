import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformConfigService } from '../platform/config/platform-config.service';
import type { PrismaService } from '../platform/database/prisma.service';
import { AuthService } from './auth.service';
import { Role } from './domain/role.enum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUDIENCE_ROLE_ID = 'role-id-audience';
const mockRole = { id: AUDIENCE_ROLE_ID, code: 'AUDIENCE', name: 'Audience' };

const mockUserWithRoles = {
  id: 'user-id-1',
  email: 'test@example.com',
  passwordHash: '',
  displayName: 'Test User',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [{ role: mockRole }],
};

function buildMocks() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn().mockResolvedValue(mockRole), // used by onModuleInit
    },
  } as unknown as PrismaService;

  const jwtService = {
    sign: vi.fn().mockReturnValue('signed-token'),
  } as unknown as JwtService;

  const config = {
    bcryptRounds: 1,
    jwtSecret: 'test-secret',
    jwtExpiry: '1h',
  } as unknown as PlatformConfigService;

  return { prisma, jwtService, config };
}

async function buildService(mocks: ReturnType<typeof buildMocks>) {
  const service = new AuthService(mocks.prisma, mocks.jwtService, mocks.config);
  await service.onModuleInit(); // warm up audienceRoleId cache
  return service;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildMocks>['prisma'];
  let jwtService: ReturnType<typeof buildMocks>['jwtService'];

  beforeEach(async () => {
    const mocks = buildMocks();
    prisma = mocks.prisma;
    jwtService = mocks.jwtService;
    service = await buildService(mocks);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    it('9.1 happy path: creates user and returns JWT token', async () => {
      const createdUser = {
        ...mockUserWithRoles,
        passwordHash: await bcrypt.hash('password123', 1),
      };
      vi.mocked(prisma.user.create).mockResolvedValue(createdUser as any);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(result).toEqual({ accessToken: 'signed-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: createdUser.id,
        roles: [Role.AUDIENCE],
      });
      // Should NOT call role.findUnique again (cached in onModuleInit)
      expect(prisma.role.findUnique).toHaveBeenCalledTimes(1); // only onModuleInit
    });

    it('9.2 throws ConflictException when email already registered (pre-existing)', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      vi.mocked(prisma.user.create).mockRejectedValue(prismaError);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('9.2b throws ConflictException on concurrent registration race condition (P2002)', async () => {
      // Simulates two concurrent requests: both pass pre-check, DB throws unique violation
      const prismaError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      vi.mocked(prisma.user.create).mockRejectedValue(prismaError);

      await expect(
        service.register({
          email: 'race@example.com',
          password: 'password123',
          displayName: 'Race User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unknown DB errors (not P2002)', async () => {
      const unknownError = new Error('Connection lost');
      vi.mocked(prisma.user.create).mockRejectedValue(unknownError);

      await expect(
        service.register({ email: 'x@x.com', password: 'password123', displayName: 'X' }),
      ).rejects.toThrow('Connection lost');
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    it('9.3 happy path: returns JWT token on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUserWithRoles,
        passwordHash,
      } as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it('9.4 throws UnauthorizedException on wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUserWithRoles,
        passwordHash,
      } as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('9.5 throws UnauthorizedException (same shape) when email does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'anypassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // onModuleInit
  // -------------------------------------------------------------------------

  describe('onModuleInit', () => {
    it('throws if AUDIENCE role is missing from DB', async () => {
      const { prisma: p, jwtService: j, config: c } = buildMocks();
      vi.mocked(p.role.findUnique).mockResolvedValue(null);

      const svc = new AuthService(p, j, c);
      await expect(svc.onModuleInit()).rejects.toThrow('AUDIENCE role not found');
    });
  });
});
