import { Injectable, Inject } from '@nestjs/common';
import { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';
import { EmailSenderPort } from '../../domain/ports/email-sender.port';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { UserNotFoundError } from '../../domain/errors';
import * as crypto from 'crypto';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject('PasswordResetTokenRepository')
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject('EmailSenderPort')
    private readonly emailSender: EmailSenderPort,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || user.status !== 'ACTIVE') {
      throw new UserNotFoundError(email);
    }

    if (!user.roles.includes('AUDIENCE')) {
      throw new UserNotFoundError(email);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); 

    await this.passwordResetTokenRepository.create(token, user.id, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.emailSender.sendPasswordResetEmail(user.email, resetLink);
    } catch (e) {
    }
  }
}
