import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PlatformConfigModule } from '../config/platform-config.module';
import { PlatformConfigService } from '../config/platform-config.service';
import {
  NOTIFICATION_CONCERT_REMINDER_QUEUE,
  NOTIFICATION_DELIVERY_QUEUE,
  NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE,
  PLATFORM_HEALTH_QUEUE,
  ARTIST_BIO_QUEUE_NAME,
  GUEST_LIST_IMPORT_QUEUE,
} from './platform-queue.constants';

@Module({
  imports: [
    PlatformConfigModule,
    BullModule.forRootAsync({
      imports: [PlatformConfigModule],
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => ({
        connection: config.redisOptions,
        prefix: config.queuePrefix,
      }),
    }),
    BullModule.registerQueue({
      name: PLATFORM_HEALTH_QUEUE,
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE,
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_DELIVERY_QUEUE,
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_CONCERT_REMINDER_QUEUE,
    }),
    BullModule.registerQueue({
      name: ARTIST_BIO_QUEUE_NAME,
    }),
    BullModule.registerQueue({ name: GUEST_LIST_IMPORT_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
