import { Injectable, Inject } from '@nestjs/common';
import { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { PasswordHasherPort, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { InvalidResetTokenError, ResetTokenExpiredError, ResetTokenAlreadyUsedError } from '../../domain/errors';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject('PasswordResetTokenRepository')
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const record = await this.passwordResetTokenRepository.findByToken(token);

    if (!record) {
      throw new InvalidResetTokenError();
    }

    if (record.usedAt) {
      throw new ResetTokenAlreadyUsedError();
    }

    if (record.expiresAt < new Date()) {
      throw new ResetTokenExpiredError();
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    
    await this.userRepository.updatePassword(record.userId, passwordHash);
    
    await this.passwordResetTokenRepository.markAsUsed(record.id);
  }
}
