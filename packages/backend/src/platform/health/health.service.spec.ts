import { describe, expect, it } from 'vitest';

import type { DatabaseHealthIndicator } from '../database/database-health.indicator';
import type { RedisHealthIndicator } from '../redis/redis-health.indicator';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns up when PostgreSQL and Redis are healthy', async () => {
    const service = new HealthService(
      { check: async () => ({ status: 'up' }) } as DatabaseHealthIndicator,
      { check: async () => ({ status: 'up' }) } as RedisHealthIndicator,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'up',
      services: {
        api: { status: 'up' },
        postgres: { status: 'up' },
        redis: { status: 'up' },
      },
    });
  });

  it('returns down when a dependency is unhealthy', async () => {
    const service = new HealthService(
      {
        check: async () => ({ status: 'down', message: 'database unavailable' }),
      } as DatabaseHealthIndicator,
      { check: async () => ({ status: 'up' }) } as RedisHealthIndicator,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'down',
      services: {
        postgres: { status: 'down', message: 'database unavailable' },
        redis: { status: 'up' },
      },
    });
  });
});
