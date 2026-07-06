import { Injectable, Inject } from '@nestjs/common';
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
    const transfer = await this.transferRepo.findPendingTransferByTicketId(ticketId);

    // Nếu không có transfer nào đang pending nhưng vé lại bị kẹt ở trạng thái TRANSFER_PENDING,
    // ta sẽ dùng cơ chế self-healing để tự động trả vé về trạng thái ISSUED.
    if (!transfer) {
      const stuckTicket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
      if (
        stuckTicket &&
        stuckTicket.status === 'TRANSFER_PENDING' &&
        stuckTicket.userId === senderId
      ) {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'ISSUED' },
        });
      }
      return { success: false, healed: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticketTransfer.update({
        where: { id: transfer.id },
        data: { status: 'CANCELLED' },
      });
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: 'ISSUED' },
      });
    });

    return { success: true };
  }
}
