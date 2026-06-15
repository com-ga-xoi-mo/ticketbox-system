import { Injectable } from '@nestjs/common';

import {
  DatabaseHealthIndicator,
  type DependencyHealth,
} from '../database/database-health.indicator';
import { RedisHealthIndicator } from '../redis/redis-health.indicator';

const HEALTH_CHECK_TIMEOUT_MS = 1500;

export interface HealthCheckResult {
  status: 'up' | 'down';
  timestamp: string;
  services: {
    api: DependencyHealth;
    postgres: DependencyHealth;
    redis: DependencyHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseHealthIndicator: DatabaseHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [postgres, redis] = await Promise.all([
      withTimeout(this.databaseHealthIndicator.check(), 'PostgreSQL health check timed out'),
      withTimeout(this.redisHealthIndicator.check(), 'Redis health check timed out'),
    ]);
    const status = postgres.status === 'up' && redis.status === 'up' ? 'up' : 'down';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'up' },
        postgres,
        redis,
      },
    };
  }
}

async function withTimeout(
  check: Promise<DependencyHealth>,
  timeoutMessage: string,
): Promise<DependencyHealth> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      check,
      new Promise<DependencyHealth>((resolve) => {
        timeout = setTimeout(() => {
          resolve({ status: 'down', message: timeoutMessage });
        }, HEALTH_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
