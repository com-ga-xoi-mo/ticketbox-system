import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import type { DependencyHealth } from '../database/database-health.indicator';
import { REDIS_CLIENT } from './redis.tokens';

@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async check(): Promise<DependencyHealth> {
    try {
      const response = await this.redisClient.ping();
      return response === 'PONG'
        ? { status: 'up' }
        : { status: 'down', message: `Unexpected Redis PING response: ${response}` };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Redis health check failed',
      };
    }
  }
}
