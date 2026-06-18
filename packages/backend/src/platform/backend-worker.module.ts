import { Module } from '@nestjs/common';

import { OrderingWorkerModule } from '../ordering/ordering-worker.module';
import { BackendCoreModule } from './backend-core.module';
import { PlatformHealthProcessor } from './queue/platform-health.processor';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [BackendCoreModule, QueueModule, OrderingWorkerModule],
  providers: [PlatformHealthProcessor],
})
export class BackendWorkerModule {}
