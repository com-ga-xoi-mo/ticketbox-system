import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { RedisModule } from '../redis/redis.module';
import { RateLimitActorKeyService } from './rate-limit-actor-key.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimitService } from './rate-limit.service';
import { RedisTokenBucketStore } from './redis-token-bucket.store';
import { TOKEN_BUCKET_STORE } from './token-bucket.types';

@Module({
  imports: [RedisModule],
  providers: [
    RateLimitActorKeyService,
    RateLimitService,
    {
      provide: TOKEN_BUCKET_STORE,
      useClass: RedisTokenBucketStore,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
  exports: [RateLimitActorKeyService, RateLimitService],
})
export class RateLimitingModule {}
