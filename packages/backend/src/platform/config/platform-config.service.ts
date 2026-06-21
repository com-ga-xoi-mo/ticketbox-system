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

  get artistBioPdfMaxBytes(): number {
    return this.configService.get('ARTIST_BIO_PDF_MAX_BYTES');
  }

  get artistBioInputMaxChars(): number {
    return this.configService.get('ARTIST_BIO_INPUT_MAX_CHARS');
  }

  get artistBioMaxAttempts(): number {
    return this.configService.get('ARTIST_BIO_MAX_ATTEMPTS');
  }

  get aiArtistBioProvider(): PlatformEnv['AI_ARTIST_BIO_PROVIDER'] {
    return this.configService.get('AI_ARTIST_BIO_PROVIDER');
  }

  get geminiApiKey(): string | undefined {
    const value = this.configService.get('GEMINI_API_KEY', { infer: true });
    return value === '' ? undefined : value;
  }

  get geminiApiUrl(): string {
    return this.configService.get('GEMINI_API_URL');
  }

  get geminiModel(): string {
    return this.configService.get('GEMINI_MODEL');
  }

  get geminiTimeoutMs(): number {
    return this.configService.get('GEMINI_TIMEOUT_MS');
  }

  get guestListDiscoveryCron(): string {
    return this.configService.get('GUEST_LIST_DISCOVERY_CRON');
  }
  get guestListInboxPath(): string {
    return this.configService.get('GUEST_LIST_INBOX_PATH');
  }
  get guestListArchivePath(): string {
    return this.configService.get('GUEST_LIST_ARCHIVE_PATH');
  }
  get guestListStoragePath(): string {
    return this.configService.get('GUEST_LIST_STORAGE_PATH');
  }
  get guestListMaxBytes(): number {
    return this.configService.get('GUEST_LIST_MAX_BYTES');
  }
  get guestListMaxRows(): number {
    return this.configService.get('GUEST_LIST_MAX_ROWS');
  }
  get guestListMaxAttempts(): number {
    return this.configService.get('GUEST_LIST_MAX_ATTEMPTS');
  }
  get guestListRetryBackoffMs(): number {
    return this.configService.get('GUEST_LIST_RETRY_BACKOFF_MS');
  }
  get guestListProcessingLeaseMs(): number {
    return this.configService.get('GUEST_LIST_PROCESSING_LEASE_MS');
  }
}
