import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailAlreadyRegisteredError } from '../../domain/errors';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import type { IUserRepository, UserRecord } from '../../domain/ports/user-repository.port';
import { Role } from '../../domain/role.enum';
import { RegisterUseCase } from './register.use-case';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockUser: UserRecord = {
  id: 'user-id-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  roles: ['AUDIENCE'],
};

function buildMocks() {
  const userRepo: IUserRepository = {
    createWithAudienceRole: vi.fn(),
    findByEmail: vi.fn(),
  };

  const passwordHasher: PasswordHasherPort = {
    hash: vi.fn(async (plainTextPassword: string) => `hashed:${plainTextPassword}`),
    compare: vi.fn(),
  };

  const tokenIssuer: TokenIssuerPort = {
    issue: vi.fn().mockReturnValue('signed-token'),
  };

  return { userRepo, passwordHasher, tokenIssuer };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: IUserRepository;
  let passwordHasher: PasswordHasherPort;
  let tokenIssuer: TokenIssuerPort;

  beforeEach(() => {
    const mocks = buildMocks();
    userRepo = mocks.userRepo;
    passwordHasher = mocks.passwordHasher;
    tokenIssuer = mocks.tokenIssuer;
    useCase = new RegisterUseCase(mocks.userRepo, mocks.passwordHasher, mocks.tokenIssuer);
  });

  it('happy path: creates user and returns JWT token', async () => {
    vi.mocked(userRepo.createWithAudienceRole).mockResolvedValue(mockUser);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });

    expect(result).toEqual({ accessToken: 'signed-token' });
    expect(tokenIssuer.issue).toHaveBeenCalledWith({
      sub: mockUser.id,
      roles: [Role.AUDIENCE],
    });
  });

  it('hashes the password before calling the repository', async () => {
    vi.mocked(userRepo.createWithAudienceRole).mockResolvedValue(mockUser);

    await useCase.execute({
      email: 'test@example.com',
      password: 'plaintext',
      displayName: 'Test User',
    });

    const callArg = vi.mocked(userRepo.createWithAudienceRole).mock.calls[0][0];
    expect(passwordHasher.hash).toHaveBeenCalledWith('plaintext');
    expect(callArg.passwordHash).toBe('hashed:plaintext');
  });

  it('propagates EmailAlreadyRegisteredError from the repository (duplicate email)', async () => {
    vi.mocked(userRepo.createWithAudienceRole).mockRejectedValue(
      new EmailAlreadyRegisteredError('dupe@example.com'),
    );

    await expect(
      useCase.execute({
        email: 'dupe@example.com',
        password: 'password123',
        displayName: 'Dup User',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rethrows unexpected errors from the repository', async () => {
    vi.mocked(userRepo.createWithAudienceRole).mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute({ email: 'x@x.com', password: 'pw12345678', displayName: 'X' }),
    ).rejects.toThrow('DB connection lost');
  });
});
