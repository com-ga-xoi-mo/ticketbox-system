import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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

    let recipient = await this.prisma.user.findUnique({
      where: { email: transfer.recipientEmail },
    });

    if (!recipient) {
      recipient = await this.prisma.user.create({
        data: {
          email: transfer.recipientEmail,
          normalizedEmail: transfer.recipientEmail.toLowerCase(),
          displayName: transfer.recipientEmail.split('@')[0],
          status: 'ACTIVE',
        },
      });

      const audienceRole = await this.prisma.role.findUnique({ where: { code: 'AUDIENCE' } });
      if (audienceRole) {
        await this.prisma.userRole.create({
          data: { userId: recipient.id, roleId: audienceRole.id },
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticketTransfer.update({
        where: { id: transfer.id },
        data: { status: 'ACCEPTED' },
      });
      await tx.ticket.update({
        where: { id: transfer.ticketId },
        data: {
          status: 'ISSUED',
          userId: recipient.id,
          transferredAt: new Date(),
        },
      });
    });

    // Fire outcome event to trigger tasks 6.2 and 7.1
    await this.eventPublisher.publishGiftOutcome({
      transferId: transfer.id,
      senderId: transfer.senderId,
      recipientName: transfer.recipientEmail, // Will use newly created user's name in full logic
      concertName: transfer.ticket.concert.title,
      outcome: 'ACCEPTED',
    });

    return { success: true, ticketId: transfer.ticketId };
  }
}
