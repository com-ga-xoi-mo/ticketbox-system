import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PlatformConfigModule } from '../config/platform-config.module';
import { PlatformConfigService } from '../config/platform-config.service';
import {
  NOTIFICATION_DELIVERY_QUEUE,
  NOTIFICATION_PURCHASE_CONFIRMATION_QUEUE,
  PLATFORM_HEALTH_QUEUE,
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
  ],
  exports: [BullModule],
})
export class QueueModule {}
