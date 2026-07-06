import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ITicketTransferRepository,
  TICKET_TRANSFER_REPOSITORY,
} from '../../domain/ports/ticket-transfer-repository.port';
import { PrismaService } from '../../../platform/database/prisma.service';

@Injectable()
export class CancelTransferUseCase {
  constructor(
    @Inject(TICKET_TRANSFER_REPOSITORY)
    private readonly transferRepo: ITicketTransferRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(ticketId: string, senderId: string) {
    // TODO: implement logic:
    // 1. Find pending transfer for ticket
    // 2. Validate senderId owns the ticket
    // 3. Transaction: transfer.status = CANCELLED, ticket.status = ISSUED
    return { success: true };
  }
}
