import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InitiateTransferUseCase } from './application/use-cases/initiate-transfer.usecase';
import { AcceptTransferUseCase } from './application/use-cases/accept-transfer.usecase';
import { DeclineTransferUseCase } from './application/use-cases/decline-transfer.usecase';
import { CancelTransferUseCase } from './application/use-cases/cancel-transfer.usecase';
import { PrismaTicketTransferRepository } from './infrastructure/database/prisma-ticket-transfer.repository';
import { TICKET_TRANSFER_REPOSITORY } from './domain/ports/ticket-transfer-repository.port';
import { GIFTING_EVENT_PUBLISHER } from './domain/ports/gifting-event-publisher.port';
import { BullMQGiftingEventPublisher } from './infrastructure/queue/bullmq-gifting-event-publisher';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    {
      provide: TICKET_TRANSFER_REPOSITORY,
      useClass: PrismaTicketTransferRepository,
    },
    {
      provide: GIFTING_EVENT_PUBLISHER,
      useClass: BullMQGiftingEventPublisher,
    },
    InitiateTransferUseCase,
    AcceptTransferUseCase,
    DeclineTransferUseCase,
    CancelTransferUseCase,
  ],
  exports: [
    InitiateTransferUseCase,
    AcceptTransferUseCase,
    DeclineTransferUseCase,
    CancelTransferUseCase,
  ],
})
export class GiftingModule {}
