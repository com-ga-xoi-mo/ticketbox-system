import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { AiArtistBioModule } from '../ai-artist-bio/ai-artist-bio.module';
import { CheckinModule } from '../checkin/checkin.module';
import { NotificationModule } from '../notification/notification.module';
import { GuestListImportModule } from '../guest-list-import/guest-list-import.module';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PlatformConfigModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    AiArtistBioModule,
    CheckinModule,
    NotificationModule,
    GuestListImportModule,
  ],
  exports: [
    PlatformConfigModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    AiArtistBioModule,
    CheckinModule,
    NotificationModule,
    GuestListImportModule,
  ],
})
export class BackendCoreModule {}
