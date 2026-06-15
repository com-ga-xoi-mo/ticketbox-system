import { Module } from '@nestjs/common';

import { BackendCoreModule } from './backend-core.module';
import { PlatformHealthProcessor } from './queue/platform-health.processor';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [BackendCoreModule, QueueModule],
  providers: [PlatformHealthProcessor],
})
export class BackendWorkerModule {}
