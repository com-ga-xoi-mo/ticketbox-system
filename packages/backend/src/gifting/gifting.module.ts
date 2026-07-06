import { Module } from '@nestjs/common';
import { InitiateTransferUseCase } from './application/use-cases/initiate-transfer.usecase';
import { PrismaTicketTransferRepository } from './infrastructure/database/prisma-ticket-transfer.repository';
import { TICKET_TRANSFER_REPOSITORY } from './domain/ports/ticket-transfer-repository.port';

@Module({
  providers: [
    {
      provide: TICKET_TRANSFER_REPOSITORY,
      useClass: PrismaTicketTransferRepository,
    },
    InitiateTransferUseCase,
  ],
  exports: [InitiateTransferUseCase],
})
export class GiftingModule {}
