import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { CheckinModule } from '../checkin/checkin.module';
import { NotificationModule } from '../notification/notification.module';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PlatformConfigModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    CheckinModule,
    NotificationModule,
  ],
  exports: [
    PlatformConfigModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    CheckinModule,
    NotificationModule,
  ],
})
export class BackendCoreModule {}
