import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';

import { PlatformConfigService } from '../config/platform-config.service';
import { RedisHealthIndicator } from './redis-health.indicator';
import { REDIS_CLIENT } from './redis.tokens';

class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClient) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.status === 'end') {
      return;
    }

    try {
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService): RedisClient => {
        const client = new Redis({
          ...config.redisOptions,
          lazyConnect: true,
        });

        client.on('error', () => {
          // Health checks surface connection errors without crashing local startup.
        });

        return client;
      },
    },
    RedisLifecycle,
    RedisHealthIndicator,
  ],
  exports: [REDIS_CLIENT, RedisHealthIndicator],
})
export class RedisModule {}
