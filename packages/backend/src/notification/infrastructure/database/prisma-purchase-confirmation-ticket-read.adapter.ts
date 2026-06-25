import { Injectable } from '@nestjs/common';
import {
  OrderStatus as PrismaOrderStatus,
  TicketStatus as PrismaTicketStatus,
} from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  PurchaseConfirmationTicketData,
  PurchaseConfirmationTicketReadPort,
} from '../../domain/ports/purchase-confirmation-ticket-read.port';

@Injectable()
export class PrismaPurchaseConfirmationTicketReadAdapter implements PurchaseConfirmationTicketReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async findIssuedTicketsByPaidOrderId(orderId: string): Promise<PurchaseConfirmationTicketData[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        orderId,
        order: { status: PrismaOrderStatus.PAID },
        status: {
          in: [PrismaTicketStatus.ISSUED, PrismaTicketStatus.CHECKED_IN],
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        orderId: true,
        userId: true,
        concertId: true,
        issuedAt: true,
        concert: {
          select: {
            title: true,
            startsAt: true,
          },
        },
        ticketType: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        ticketNumber: 'asc',
      },
    });

    return tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      orderId: ticket.orderId,
      userId: ticket.userId,
      concertId: ticket.concertId,
      concertTitle: ticket.concert.title,
      concertStartsAt: ticket.concert.startsAt,
      ticketTypeName: ticket.ticketType.name,
      issuedAt: ticket.issuedAt,
    }));
  }
}
