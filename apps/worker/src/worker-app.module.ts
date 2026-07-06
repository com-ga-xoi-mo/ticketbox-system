import { Module } from '@nestjs/common';
import { BackendWorkerModule, NotificationModule } from '@ticketbox/backend';
import { TicketTransferExpireProcessor } from './gifting/ticket-transfer.processor';
import { GiftEmailProcessor } from './gifting/gift-email.processor';

@Module({
  imports: [BackendWorkerModule, NotificationModule],
  providers: [TicketTransferExpireProcessor, GiftEmailProcessor],
})
export class WorkerAppModule {}
