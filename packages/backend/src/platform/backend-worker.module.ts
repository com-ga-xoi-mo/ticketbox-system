import { Module } from '@nestjs/common';

import { BackendCoreModule } from './backend-core.module';
import { ArtistBioProcessor } from '../ai-artist-bio/ai-artist-bio.module';
import {
  GuestListImportProcessor,
  GuestListSchedulerService,
} from '../guest-list-import/guest-list-import.module';
import { NotificationDeliveryProcessor } from '../notification/adapters/inbound/queue/notification-delivery.processor';
import { PurchaseConfirmationProcessor } from '../notification/adapters/inbound/queue/purchase-confirmation.processor';
import { PlatformHealthProcessor } from './queue/platform-health.processor';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [BackendCoreModule, QueueModule],
  providers: [
    PlatformHealthProcessor,
    ArtistBioProcessor,
    PurchaseConfirmationProcessor,
    NotificationDeliveryProcessor,
    GuestListImportProcessor,
    GuestListSchedulerService,
  ],
})
export class BackendWorkerModule {}
