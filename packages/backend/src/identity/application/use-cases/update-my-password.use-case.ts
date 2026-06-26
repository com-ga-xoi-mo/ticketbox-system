import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { PASSWORD_HASHER, PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { InvalidCredentialsError } from '../../domain/errors';
import { UpdateMyPasswordDto } from '../../adapters/http/dto/password.dto';

@Injectable()
export class UpdateMyPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(userId: string, cmd: UpdateMyPasswordDto): Promise<void> {
    const userRecord = await this.userRepo.findByIdWithPassword(userId);
    if (!userRecord) {
      throw new Error('User not found');
    }

    const isValid = await this.passwordHasher.compare(cmd.currentPassword, userRecord.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const newPasswordHash = await this.passwordHasher.hash(cmd.newPassword);
    await this.userRepo.updatePassword(userId, newPasswordHash);
  }
}
