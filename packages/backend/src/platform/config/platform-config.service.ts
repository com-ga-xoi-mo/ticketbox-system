import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

import type { PlatformEnv } from './env.schema';

@Injectable()
export class PlatformConfigService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<PlatformEnv, true>,
  ) {}

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

  get internalApiKey(): string {
    return this.configService.get('INTERNAL_API_KEY');
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

  get qrTokenSecret(): string {
    return this.configService.get('QR_TOKEN_SECRET');
  }

  get bcryptRounds(): number {
    return this.configService.get('BCRYPT_ROUNDS');
  }

  get orderReservationTtlMinutes(): number {
    return this.configService.get('ORDER_RESERVATION_TTL_MINUTES');
  }

  get momoPartnerCode(): string {
    return this.configService.get('MOMO_PARTNER_CODE');
  }

  get momoAccessKey(): string {
    return this.configService.get('MOMO_ACCESS_KEY');
  }

  get momoSecretKey(): string {
    return this.configService.get('MOMO_SECRET_KEY');
  }

  get momoEndpoint(): string {
    return this.configService.get('MOMO_ENDPOINT');
  }

  get momoRequestType(): string {
    return this.configService.get('MOMO_REQUEST_TYPE');
  }

  get momoReturnUrl(): string {
    return this.configService.get('MOMO_RETURN_URL');
  }

  get momoIpnUrl(): string {
    return this.configService.get('MOMO_IPN_URL');
  }

  get vnpayTmnCode(): string {
    return this.configService.get('VNPAY_TMN_CODE');
  }

  get vnpayHashSecret(): string {
    return this.configService.get('VNPAY_HASH_SECRET');
  }

  get vnpayPaymentUrl(): string {
    return this.configService.get('VNPAY_PAYMENT_URL');
  }

  get vnpayReturnUrl(): string {
    return this.configService.get('VNPAY_RETURN_URL');
  }

  get vnpayIpnUrl(): string {
    return this.configService.get('VNPAY_IPN_URL');
  }

  get vnpayVersion(): string {
    return this.configService.get('VNPAY_VERSION');
  }

  get vnpayCommand(): string {
    return this.configService.get('VNPAY_COMMAND');
  }

  get vnpayLocale(): PlatformEnv['VNPAY_LOCALE'] {
    return this.configService.get('VNPAY_LOCALE');
  }

  get vnpayOrderType(): string {
    return this.configService.get('VNPAY_ORDER_TYPE');
  }

  get vnpayExpireMinutes(): number {
    return this.configService.get('VNPAY_EXPIRE_MINUTES');
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

  get emailSmtpUser(): string | undefined {
    return this.configService.get('EMAIL_SMTP_USER', { infer: true });
  }

  get emailSmtpPass(): string | undefined {
    return this.configService.get('EMAIL_SMTP_PASS', { infer: true });
  }

  get emailSmtpSecure(): boolean {
    return this.configService.get('EMAIL_SMTP_SECURE');
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

  get seatingMapSvgMaxBytes(): number {
    return this.configService.get('SEATING_MAP_SVG_MAX_BYTES');
  }

  get posterImageMaxBytes(): number {
    return this.configService.get('POSTER_IMAGE_MAX_BYTES');
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

  get storageDriver(): PlatformEnv['STORAGE_DRIVER'] {
    return this.configService.get('STORAGE_DRIVER');
  }

  get localStorageRootDir(): string {
    return this.configService.get('LOCAL_STORAGE_ROOT_DIR');
  }

  get localStoragePublicBaseUrl(): string {
    return this.configService.get('LOCAL_STORAGE_PUBLIC_BASE_URL');
  }

  get ticketAccessBaseUrl(): string {
    return this.configService.get('TICKET_ACCESS_BASE_URL');
  }

  get s3Endpoint(): string | undefined {
    return this.configService.get('S3_ENDPOINT', { infer: true });
  }

  get s3Region(): string | undefined {
    return this.configService.get('S3_REGION', { infer: true });
  }

  get s3Bucket(): string | undefined {
    return this.configService.get('S3_BUCKET', { infer: true });
  }

  get s3AccessKeyId(): string | undefined {
    return this.configService.get('S3_ACCESS_KEY_ID', { infer: true });
  }

  get s3SecretAccessKey(): string | undefined {
    return this.configService.get('S3_SECRET_ACCESS_KEY', { infer: true });
  }

  get s3PublicBaseUrl(): string | undefined {
    return this.configService.get('S3_PUBLIC_BASE_URL', { infer: true });
  }
}
