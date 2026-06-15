import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly config: PlatformConfigService) {}

  async hash(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, this.config.bcryptRounds);
  }

  async compare(plainTextPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, passwordHash);
  }
}
