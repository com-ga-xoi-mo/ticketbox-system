import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, RedisModule, RateLimitingModule, AuthModule],
  exports: [PlatformConfigModule, DatabaseModule, RedisModule, RateLimitingModule, AuthModule],
})
export class BackendCoreModule {}
