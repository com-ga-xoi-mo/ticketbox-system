import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepository: any;
  let tokenRepository: any;
  let emailSender: any;

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn(),
    };
    tokenRepository = {
      create: vi.fn(),
    };
    emailSender = {
      sendPasswordResetEmail: vi.fn(),
    };

    useCase = new ForgotPasswordUseCase(
      userRepository,
      tokenRepository,
      emailSender,
    );
  });

  it('should generate token and send email if user is active and has audience role', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      status: 'ACTIVE',
      roles: ['AUDIENCE'],
    });

    await useCase.execute('test@example.com');

    expect(tokenRepository.create).toHaveBeenCalledWith(
      expect.any(String),
      'user1',
      expect.any(Date),
    );
    expect(emailSender.sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('/reset-password?token='),
    );
  });

  it('should throw UserNotFoundError if email is not found', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('unknown@example.com')).rejects.toThrow('User not found: unknown@example.com');

    expect(tokenRepository.create).not.toHaveBeenCalled();
    expect(emailSender.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError if user is disabled', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      status: 'DISABLED',
      roles: ['AUDIENCE'],
    });

    await expect(useCase.execute('test@example.com')).rejects.toThrow('User not found: test@example.com');

    expect(tokenRepository.create).not.toHaveBeenCalled();
    expect(emailSender.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should not throw if email sending fails', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user1',
      email: 'test@example.com',
      status: 'ACTIVE',
      roles: ['AUDIENCE'],
    });
    emailSender.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP Error'));

    await expect(useCase.execute('test@example.com')).resolves.toBeUndefined();
  });
});
