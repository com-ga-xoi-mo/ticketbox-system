import { Inject, Injectable } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';
import type { RealtimeNotificationPublisherPort } from '../../domain/ports/realtime-notification-publisher.port';
import { NOTIFICATION_SIGNAL, userNotificationChannel } from '../../domain/realtime-notification';

/**
 * Publishes a lightweight per-user signal over Redis pub/sub. The worker process creates
 * notifications and calls this; the API process subscribes and forwards to open SSE
 * streams. Publishing never throws into the caller — a realtime miss is non-fatal because
 * the client reconciles via the REST inbox.
 */
@Injectable()
export class RedisRealtimeNotificationPublisher implements RealtimeNotificationPublisherPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async publishNewNotification(userId: string): Promise<void> {
    try {
      await this.redis.publish(userNotificationChannel(userId), JSON.stringify(NOTIFICATION_SIGNAL));
    } catch {
      // Best-effort: a dropped signal is recovered by the client re-fetching the REST inbox.
    }
  }
}
