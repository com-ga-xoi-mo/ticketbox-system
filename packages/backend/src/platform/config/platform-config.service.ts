import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

import type { PlatformEnv } from './env.schema';

@Injectable()
export class PlatformConfigService {
  constructor(private readonly configService: ConfigService<PlatformEnv, true>) {}

  get nodeEnv(): PlatformEnv['NODE_ENV'] {
    return this.configService.get('NODE_ENV');
  }

  get port(): number {
    return this.configService.get('PORT');
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }

  get queuePrefix(): string {
    return this.configService.get('QUEUE_PREFIX');
  }

  get redisOptions(): RedisOptions {
    const password = this.configService.get('REDIS_PASSWORD', { infer: true });

    return {
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: password === '' ? undefined : password,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    };
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET');
  }

  get jwtExpiry(): string {
    return this.configService.get('JWT_EXPIRY');
  }

  get bcryptRounds(): number {
    return this.configService.get('BCRYPT_ROUNDS');
  }

  get emailProvider(): PlatformEnv['EMAIL_PROVIDER'] {
    return this.configService.get('EMAIL_PROVIDER');
  }

  get emailFrom(): string {
    return this.configService.get('EMAIL_FROM');
  }

  get emailMaxAttempts(): number {
    return this.configService.get('EMAIL_MAX_ATTEMPTS');
  }

  get emailRetryBackoffMs(): number {
    return this.configService.get('EMAIL_RETRY_BACKOFF_MS');
  }

  get emailSmtpHost(): string {
    return this.configService.get('EMAIL_SMTP_HOST');
  }

  get emailSmtpPort(): number {
    return this.configService.get('EMAIL_SMTP_PORT');
  }

  get maildevWebUrl(): string | undefined {
    return this.configService.get('MAILDEV_WEB_URL', { infer: true });
  }
}
