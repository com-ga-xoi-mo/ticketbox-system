import { Injectable, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import {
  ITicketTransferRepository,
  TICKET_TRANSFER_REPOSITORY,
} from '../../domain/ports/ticket-transfer-repository.port';
import {
  IGiftingEventPublisher,
  GIFTING_EVENT_PUBLISHER,
} from '../../domain/ports/gifting-event-publisher.port';
import { PrismaService } from '../../../platform/database/prisma.service'; // Used for cross-aggregate fetching
import { randomUUID, createHash } from 'crypto';

export interface InitiateTransferCommand {
  ticketId: string;
  senderId: string;
  recipientEmail: string;
}

@Injectable()
export class InitiateTransferUseCase {
  constructor(
    @Inject(TICKET_TRANSFER_REPOSITORY)
    private readonly transferRepo: ITicketTransferRepository,
    @Inject(GIFTING_EVENT_PUBLISHER)
    private readonly eventPublisher: IGiftingEventPublisher,
    private readonly prisma: PrismaService, // For fetching ticket aggregate + relations
  ) {}

  async execute(command: InitiateTransferCommand) {
    const { ticketId, senderId, recipientEmail } = command;

    // Fetch ticket and verify ownership/status
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        concert: true,
        ticketType: true,
        user: true,
      },
    });

    if (!ticket) {
      throw new ConflictException('Ticket not found');
    }

    if (ticket.userId !== senderId) {
      throw new ForbiddenException('You do not own this ticket');
    }

    if (ticket.status !== 'ISSUED') {
      throw new ConflictException('TICKET_NOT_GIFTABLE');
    }

    const startsAt = ticket.concert.startsAt;
    const hoursUntilEvent = (startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
      throw new ConflictException('TRANSFER_WINDOW_CLOSED');
    }

    // Expiry is 48 hours from now, OR 24 hours before the event starts (whichever is sooner)
    const maxExpiryAllowed = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    const standardExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const expiresAt = standardExpiry < maxExpiryAllowed ? standardExpiry : maxExpiryAllowed;

    const existingPending = await this.transferRepo.findPendingTransferByTicketId(ticketId);

    if (existingPending) {
      throw new ConflictException('TRANSFER_ALREADY_PENDING');
    }

    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Atomic creation via our port
    const transfer = await this.transferRepo.createTransfer({
      ticketId,
      senderId,
      recipientEmail,
      tokenHash,
      expiresAt,
    });

    // Fire events
    await this.eventPublisher.publishGiftInvitation({
      transferId: transfer.id,
      senderName: ticket.user.displayName || ticket.user.email,
      recipientEmail: transfer.recipientEmail,
      concertName: ticket.concert.title,
      ticketType: ticket.ticketType.name,
      token,
      expiresAt: transfer.expiresAt,
    });

    return {
      transferId: transfer.id,
      recipientEmail: transfer.recipientEmail,
      expiresAt: transfer.expiresAt,
      status: transfer.status,
      token, // Return plaintext token (only time it is available)
    };
  }
}
