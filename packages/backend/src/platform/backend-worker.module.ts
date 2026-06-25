import { Module } from '@nestjs/common';

import { ArtistBioProcessor } from '../ai-artist-bio/ai-artist-bio.module';
import {
  GuestListImportProcessor,
  GuestListSchedulerService,
} from '../guest-list-import/guest-list-import.module';
import { ConcertReminderProcessor } from '../notification/adapters/inbound/queue/concert-reminder.processor';
import { NotificationDeliveryProcessor } from '../notification/adapters/inbound/queue/notification-delivery.processor';
import { PurchaseConfirmationProcessor } from '../notification/adapters/inbound/queue/purchase-confirmation.processor';
import { OrderingWorkerModule } from '../ordering/ordering-worker.module';
import { PaymentRecoveryWorkerModule } from '../payment/payment-recovery-worker.module';
import { BackendCoreModule } from './backend-core.module';
import { PlatformHealthProcessor } from './queue/platform-health.processor';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    BackendCoreModule,
    QueueModule,
    OrderingWorkerModule,
    PaymentRecoveryWorkerModule,
  ],
  providers: [
    PlatformHealthProcessor,
    ArtistBioProcessor,
    PurchaseConfirmationProcessor,
    NotificationDeliveryProcessor,
    ConcertReminderProcessor,
    GuestListImportProcessor,
    GuestListSchedulerService,
  ],
})
export class BackendWorkerModule {}
