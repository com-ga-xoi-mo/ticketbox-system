import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidCredentialsError } from '../../domain/errors';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import type { IUserRepository, UserRecord } from '../../domain/ports/user-repository.port';
import { LoginUseCase } from './login.use-case';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeUserRecord(password: string): UserRecord {
  return {
    id: 'user-id-1',
    email: 'test@example.com',
    passwordHash: `hashed:${password}`,
    roles: ['AUDIENCE'],
  };
}

function buildMocks() {
  const userRepo: IUserRepository = {
    createWithAudienceRole: vi.fn(),
    findByEmail: vi.fn(),
  };

  const passwordHasher: PasswordHasherPort = {
    hash: vi.fn(),
    compare: vi.fn(async (plainTextPassword, passwordHash) => {
      return passwordHash === `hashed:${plainTextPassword}`;
    }),
  };

  const tokenIssuer: TokenIssuerPort = {
    issue: vi.fn().mockReturnValue('signed-token'),
  };

  return { userRepo, passwordHasher, tokenIssuer };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: IUserRepository;
  let passwordHasher: PasswordHasherPort;
  let tokenIssuer: TokenIssuerPort;

  beforeEach(() => {
    const mocks = buildMocks();
    userRepo = mocks.userRepo;
    passwordHasher = mocks.passwordHasher;
    tokenIssuer = mocks.tokenIssuer;
    useCase = new LoginUseCase(mocks.userRepo, mocks.passwordHasher, mocks.tokenIssuer);
  });

  it('happy path: returns JWT token on valid credentials', async () => {
    const user = makeUserRecord('correct-password');
    vi.mocked(userRepo.findByEmail).mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'correct-password',
    });

    expect(result).toEqual({ accessToken: 'signed-token' });
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'correct-password',
      'hashed:correct-password',
    );
    expect(tokenIssuer.issue).toHaveBeenCalledWith({
      sub: user.id,
      roles: user.roles,
    });
  });

  it('throws InvalidCredentialsError on wrong password', async () => {
    const user = makeUserRecord('correct-password');
    vi.mocked(userRepo.findByEmail).mockResolvedValue(user);

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError when email does not exist (same shape — no email leakage)', async () => {
    vi.mocked(userRepo.findByEmail).mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'anypassword' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('InvalidCredentialsError message is generic for both wrong-password and missing-user', async () => {
    vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
    const err1 = await useCase.execute({ email: 'x@x.com', password: 'pw' }).catch((e) => e);

    const user = makeUserRecord('correct');
    vi.mocked(userRepo.findByEmail).mockResolvedValue(user);
    const err2 = await useCase.execute({ email: 'x@x.com', password: 'wrong' }).catch((e) => e);

    expect((err1 as InvalidCredentialsError).message).toBe(
      (err2 as InvalidCredentialsError).message,
    );
  });
});
