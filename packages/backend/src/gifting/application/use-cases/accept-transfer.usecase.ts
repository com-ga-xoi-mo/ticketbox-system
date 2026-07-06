import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import {
  ITicketTransferRepository,
  TICKET_TRANSFER_REPOSITORY,
} from '../../domain/ports/ticket-transfer-repository.port';
import {
  IGiftingEventPublisher,
  GIFTING_EVENT_PUBLISHER,
} from '../../domain/ports/gifting-event-publisher.port';
import { PrismaService } from '../../../platform/database/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class AcceptTransferUseCase {
  constructor(
    @Inject(TICKET_TRANSFER_REPOSITORY)
    private readonly transferRepo: ITicketTransferRepository,
    @Inject(GIFTING_EVENT_PUBLISHER)
    private readonly eventPublisher: IGiftingEventPublisher,
    private readonly prisma: PrismaService, // For atomic acceptance transaction
  ) {}

  async execute(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Basic logic to retrieve transfer
    const transfer = await this.prisma.ticketTransfer.findUnique({
      where: { tokenHash },
      include: { ticket: { include: { concert: true } }, sender: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');

    // ... (Validation and transactional DB updates would go here) ...

    // Fire outcome event to trigger tasks 6.2 and 7.1
    await this.eventPublisher.publishGiftOutcome({
      transferId: transfer.id,
      senderId: transfer.senderId,
      recipientName: transfer.recipientEmail, // Will use newly created user's name in full logic
      concertName: transfer.ticket.concert.title,
      outcome: 'ACCEPTED',
    });

    return { success: true };
  }
}
