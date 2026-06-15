import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, RedisModule, AuthModule],
  exports: [PlatformConfigModule, DatabaseModule, RedisModule, AuthModule],
})
export class BackendCoreModule {}
