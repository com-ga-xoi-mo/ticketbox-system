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
}
