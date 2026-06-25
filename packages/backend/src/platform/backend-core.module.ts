import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { AiArtistBioModule } from '../ai-artist-bio/ai-artist-bio.module';
import { ArtistDiscoveryModule } from '../artist-discovery/artist-discovery.module';
import { CheckinModule } from '../checkin/checkin.module';
import { NotificationModule } from '../notification/notification.module';
import { GuestListImportModule } from '../guest-list-import/guest-list-import.module';
import { PlatformConfigModule } from './config/platform-config.module';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    PlatformConfigModule,
    StorageModule.forRoot(),
    DatabaseModule,
    RedisModule,
    CacheModule,
    RateLimitingModule,
    AuthModule,
    AiArtistBioModule,
    ArtistDiscoveryModule,
    CheckinModule,
    NotificationModule,
    GuestListImportModule,
  ],
  exports: [
    PlatformConfigModule,
    StorageModule,
    DatabaseModule,
    RedisModule,
    CacheModule,
    RateLimitingModule,
    AuthModule,
    AiArtistBioModule,
    ArtistDiscoveryModule,
    CheckinModule,
    NotificationModule,
    GuestListImportModule,
  ],
})
export class BackendCoreModule {}
