import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ConcertNotFoundError,
  EmailAlreadyRegisteredError,
  ForbiddenAdminActionError,
  InvalidBulkCheckinStaffRequestError,
} from '../../domain/errors';
import type { BulkCheckinStaffProvisioningRepositoryPort } from '../../domain/ports/bulk-checkin-staff-provisioning.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import { Role } from '../../domain/role.enum';
import { UserStatus } from '../../domain/user-status.enum';
import { AuthorizeAdminActionUseCase } from './authorize-admin-action.use-case';
import {
  BulkCreateCheckinStaffUseCase,
  generateBulkCheckinStaffEmails,
} from './bulk-create-checkin-staff.use-case';

describe('generateBulkCheckinStaffEmails', () => {
  it('generates numeric-suffixed email sequence from a base email', () => {
    expect(generateBulkCheckinStaffEmails('abc@gmail.com', 3)).toEqual([
      'abc@gmail.com',
      'abc1@gmail.com',
      'abc2@gmail.com',
    ]);
  });

  it('normalizes email casing and whitespace', () => {
    expect(generateBulkCheckinStaffEmails('  ABC@Gmail.COM  ', 2)).toEqual([
      'abc@gmail.com',
      'abc1@gmail.com',
    ]);
  });

  it('rejects invalid quantity and base email', () => {
    expect(() => generateBulkCheckinStaffEmails('abc@gmail.com', 0)).toThrow(
      InvalidBulkCheckinStaffRequestError,
    );
    expect(() => generateBulkCheckinStaffEmails('not-email', 1)).toThrow(
      InvalidBulkCheckinStaffRequestError,
    );
  });
});

describe('BulkCreateCheckinStaffUseCase', () => {
  let userRepository: IUserRepository;
  let provisioningRepository: BulkCheckinStaffProvisioningRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let useCase: BulkCreateCheckinStaffUseCase;

  beforeEach(() => {
    userRepository = {
      createWithAudienceRole: vi.fn(),
      createWithRoles: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByIdWithPassword: vi.fn(),
      updatePassword: vi.fn(),
      replaceAvatar: vi.fn(),
      clearAvatar: vi.fn(),
      findExistingEmails: vi.fn(),
      listUsers: vi.fn(),
      updateProfile: vi.fn(),
      setStatus: vi.fn(),
      setRoles: vi.fn(),
    };
    provisioningRepository = {
      findConcertSummary: vi.fn(),
      createAccountsAndAssignments: vi.fn(),
    };
    passwordHasher = {
      hash: vi.fn(async (password: string) => `hashed:${password}`),
      compare: vi.fn(),
    };
    useCase = new BulkCreateCheckinStaffUseCase(
      userRepository,
      passwordHasher,
      provisioningRepository,
      new AuthorizeAdminActionUseCase(),
    );
  });

  it('creates check-in staff credentials and concert-wide assignments', async () => {
    vi.mocked(provisioningRepository.findConcertSummary).mockResolvedValue({
      id: 'concert-1',
      title: 'Summer Live',
    });
    vi.mocked(userRepository.findExistingEmails).mockResolvedValue([]);
    vi.mocked(provisioningRepository.createAccountsAndAssignments).mockImplementation(
      async ({ accounts }) =>
        accounts.map((account, index) => ({
          userId: `user-${index + 1}`,
          email: account.email,
          displayName: account.displayName,
          status: UserStatus.ACTIVE,
          assignmentId: `assignment-${index + 1}`,
        })),
    );

    const result = await useCase.execute({
      actor: { userId: 'admin-1', roles: [Role.ADMIN] },
      concertId: 'concert-1',
      baseEmail: 'abc@gmail.com',
      quantity: 2,
      displayNamePrefix: 'Gate Staff',
    });

    expect(userRepository.findExistingEmails).toHaveBeenCalledWith([
      'abc@gmail.com',
      'abc1@gmail.com',
    ]);
    expect(result).toMatchObject({
      concertId: 'concert-1',
      concertTitle: 'Summer Live',
      credentials: [
        {
          userId: 'user-1',
          displayName: 'Gate Staff 1',
          email: 'abc@gmail.com',
          assignmentId: 'assignment-1',
          concertTitle: 'Summer Live',
        },
        {
          userId: 'user-2',
          displayName: 'Gate Staff 2',
          email: 'abc1@gmail.com',
          assignmentId: 'assignment-2',
          concertTitle: 'Summer Live',
        },
      ],
    });
    expect(result.credentials[0].password).toEqual(expect.any(String));
    expect(result.credentials[0].password.length).toBeGreaterThanOrEqual(12);
    expect(passwordHasher.hash).toHaveBeenCalledTimes(2);

    const createArg = vi.mocked(provisioningRepository.createAccountsAndAssignments).mock.calls[0][0];
    expect(createArg).toMatchObject({
      concertId: 'concert-1',
      accounts: [
        { email: 'abc@gmail.com', displayName: 'Gate Staff 1' },
        { email: 'abc1@gmail.com', displayName: 'Gate Staff 2' },
      ],
    });
    expect(createArg.accounts[0]).not.toHaveProperty('password');
    expect(createArg.accounts[0].passwordHash).toBe(`hashed:${result.credentials[0].password}`);
  });

  it('rejects non-admin actors before reading or writing data', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'organizer-1', roles: [Role.ORGANIZER] },
        concertId: 'concert-1',
        baseEmail: 'abc@gmail.com',
        quantity: 1,
        displayNamePrefix: 'Gate Staff',
      }),
    ).rejects.toThrow(ForbiddenAdminActionError);

    expect(provisioningRepository.findConcertSummary).not.toHaveBeenCalled();
  });

  it('rejects unknown concerts', async () => {
    vi.mocked(provisioningRepository.findConcertSummary).mockResolvedValue(null);

    await expect(
      useCase.execute({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'missing-concert',
        baseEmail: 'abc@gmail.com',
        quantity: 1,
        displayNamePrefix: 'Gate Staff',
      }),
    ).rejects.toThrow(ConcertNotFoundError);
  });

  it('rejects the whole batch before hashing or writing when a generated email exists', async () => {
    vi.mocked(provisioningRepository.findConcertSummary).mockResolvedValue({
      id: 'concert-1',
      title: 'Summer Live',
    });
    vi.mocked(userRepository.findExistingEmails).mockResolvedValue(['abc1@gmail.com']);

    await expect(
      useCase.execute({
        actor: { userId: 'admin-1', roles: [Role.ADMIN] },
        concertId: 'concert-1',
        baseEmail: 'abc@gmail.com',
        quantity: 2,
        displayNamePrefix: 'Gate Staff',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(provisioningRepository.createAccountsAndAssignments).not.toHaveBeenCalled();
  });
});
