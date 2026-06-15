import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PlatformConfigService } from '../config/platform-config.service';
import { PLATFORM_HEALTH_QUEUE } from './platform-queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) => ({
        connection: config.redisOptions,
        prefix: config.queuePrefix,
      }),
    }),
    BullModule.registerQueue({
      name: PLATFORM_HEALTH_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
