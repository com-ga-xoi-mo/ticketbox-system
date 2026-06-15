import { Module } from '@nestjs/common';

import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [PlatformConfigModule, DatabaseModule, RedisModule],
  exports: [PlatformConfigModule, DatabaseModule, RedisModule],
})
export class BackendCoreModule {}
