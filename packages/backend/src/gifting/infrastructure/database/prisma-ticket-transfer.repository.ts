import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import {
  ITicketTransferRepository,
  CreateTransferData,
  TicketTransferRecord,
} from '../../domain/ports/ticket-transfer-repository.port';
import { TicketTransferStatus } from '@prisma/client';

@Injectable()
export class PrismaTicketTransferRepository implements ITicketTransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPendingTransferByTicketId(ticketId: string): Promise<TicketTransferRecord | null> {
    const transfer = await this.prisma.ticketTransfer.findFirst({
      where: { ticketId, status: 'PENDING' },
    });

    if (!transfer) return null;

    return {
      ...transfer,
      status: transfer.status as TicketTransferRecord['status'],
    };
  }

  async createTransfer(data: CreateTransferData): Promise<TicketTransferRecord> {
    const transfer = await this.prisma.$transaction(async (tx) => {
      // Optimistic concurrency check: ensure ticket is still ISSUED
      const updateResult = await tx.ticket.updateMany({
        where: {
          id: data.ticketId,
          status: 'ISSUED',
        },
        data: { status: 'TRANSFER_PENDING' },
      });

      if (updateResult.count === 0) {
        throw new Error('Ticket is no longer available for gifting (optimistic lock failed)');
      }

      const newTransfer = await tx.ticketTransfer.create({
        data: {
          ticketId: data.ticketId,
          senderId: data.senderId,
          recipientEmail: data.recipientEmail,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          status: TicketTransferStatus.PENDING,
        },
      });

      return newTransfer;
    });

    return {
      ...transfer,
      status: transfer.status as TicketTransferRecord['status'],
    };
  }
}
