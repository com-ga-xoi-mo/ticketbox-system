import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';
import {
  NOTIFICATION_CHANNEL_PATTERN,
  NOTIFICATION_SIGNAL,
  userIdFromChannel,
} from '../../domain/realtime-notification';
import { NotificationStreamRegistry } from './notification-stream.registry';

/**
 * API-side bridge: subscribes (on a dedicated Redis connection) to every user's signal
 * channel and forwards each signal to that user's open SSE streams held by this instance.
 * A separate connection is required because an ioredis client in subscriber mode cannot run
 * normal commands.
 */
@Injectable()
export class RedisNotificationStreamSubscriber implements OnModuleInit, OnModuleDestroy {
  private subscriber?: RedisClient;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    private readonly registry: NotificationStreamRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const subscriber = this.redis.duplicate();
    this.subscriber = subscriber;
    subscriber.on('pmessage', (_pattern: string, channel: string) => {
      const userId = userIdFromChannel(channel);
      if (!userId) return;
      this.registry.emit(userId, {
        type: NOTIFICATION_SIGNAL.type,
        data: JSON.stringify(NOTIFICATION_SIGNAL),
      });
    });
    subscriber.on('error', () => {
      // Connection errors are surfaced by health checks; do not crash the API.
    });
    try {
      await subscriber.psubscribe(NOTIFICATION_CHANNEL_PATTERN);
    } catch {
      // If Redis is unavailable the stream simply won't push; REST inbox still works.
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.subscriber) return;
    try {
      await this.subscriber.quit();
    } catch {
      this.subscriber.disconnect();
    }
  }
}
