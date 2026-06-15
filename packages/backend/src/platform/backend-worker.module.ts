import { Module } from '@nestjs/common';

import { BackendCoreModule } from './backend-core.module';
import { NotificationDeliveryProcessor } from '../notification/infrastructure/queue/notification-delivery.processor';
import { PurchaseConfirmationProcessor } from '../notification/infrastructure/queue/purchase-confirmation.processor';
import { PlatformHealthProcessor } from './queue/platform-health.processor';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [BackendCoreModule, QueueModule],
  providers: [
    PlatformHealthProcessor,
    PurchaseConfirmationProcessor,
    NotificationDeliveryProcessor,
  ],
})
export class BackendWorkerModule {}
