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

const mockRole = { id: 'role-id-audience', code: 'AUDIENCE', name: 'Audience' };

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
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    sign: vi.fn().mockReturnValue('signed-token'),
  } as unknown as JwtService;

  const config = {
    bcryptRounds: 1, // fast in tests
    jwtSecret: 'test-secret',
    jwtExpiry: '1h',
  } as unknown as PlatformConfigService;

  return { prisma, jwtService, config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildMocks>['prisma'];
  let jwtService: ReturnType<typeof buildMocks>['jwtService'];

  beforeEach(() => {
    const mocks = buildMocks();
    prisma = mocks.prisma;
    jwtService = mocks.jwtService;
    service = new AuthService(prisma, jwtService, mocks.config);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    it('9.1 happy path: creates user and returns JWT token', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as any);
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
    });

    it('9.2 throws ConflictException when email already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithRoles as any);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
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
});
