import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { InvalidResetTokenError, ResetTokenAlreadyUsedError, ResetTokenExpiredError } from '../../domain/errors';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let userRepository: any;
  let tokenRepository: any;
  let passwordHasher: any;

  beforeEach(() => {
    userRepository = {
      updatePassword: vi.fn(),
    };
    tokenRepository = {
      findByToken: vi.fn(),
      markAsUsed: vi.fn(),
    };
    passwordHasher = {
      hash: vi.fn(),
    };

    useCase = new ResetPasswordUseCase(
      userRepository,
      tokenRepository,
      passwordHasher,
    );
  });

  it('should reset password with valid token', async () => {
    tokenRepository.findByToken.mockResolvedValue({
      id: 'token1',
      userId: 'user1',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 100000),
      usedAt: null,
    });
    passwordHasher.hash.mockResolvedValue('new-hash');

    await useCase.execute('valid-token', 'newPassword123');

    expect(passwordHasher.hash).toHaveBeenCalledWith('newPassword123');
    expect(userRepository.updatePassword).toHaveBeenCalledWith('user1', 'new-hash');
    expect(tokenRepository.markAsUsed).toHaveBeenCalledWith('token1');
  });

  it('should throw InvalidResetTokenError for non-existent token', async () => {
    tokenRepository.findByToken.mockResolvedValue(null);

    await expect(useCase.execute('invalid-token', 'newPassword123'))
      .rejects.toThrow(InvalidResetTokenError);
  });

  it('should throw ResetTokenAlreadyUsedError for used token', async () => {
    tokenRepository.findByToken.mockResolvedValue({
      id: 'token1',
      userId: 'user1',
      token: 'used-token',
      expiresAt: new Date(Date.now() + 100000),
      usedAt: new Date(),
    });

    await expect(useCase.execute('used-token', 'newPassword123'))
      .rejects.toThrow(ResetTokenAlreadyUsedError);
  });

  it('should throw ResetTokenExpiredError for expired token', async () => {
    tokenRepository.findByToken.mockResolvedValue({
      id: 'token1',
      userId: 'user1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 100000),
      usedAt: null,
    });

    await expect(useCase.execute('expired-token', 'newPassword123'))
      .rejects.toThrow(ResetTokenExpiredError);
  });
});
