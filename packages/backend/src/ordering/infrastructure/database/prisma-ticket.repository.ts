import { Injectable } from '@nestjs/common';
import { Prisma, TicketStatus as PrismaTicketStatus } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import {
  TicketIssuanceOrderNotFoundError,
  TicketIssuanceOrderNotPaidError,
  TicketPartialIssuanceConflictError,
} from '../../domain/errors';
import { OrderStatus } from '../../domain/order-status.enum';
import type {
  IssueTicketsForPaidOrderData,
  PaidOrderForTicketIssuance,
  TicketRepositoryPort,
} from '../../domain/ports/ticket-repository.port';
import { Ticket } from '../../domain/ticket.entity';
import type { TicketSummary } from '../../domain/ticket-read.model';
import { TicketStatus } from '../../domain/ticket-status.enum';

interface PrismaTicketRecord {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  qrTokenHash: string;
  status: string;
  issuedAt: Date;
  checkedInAt: Date | null;
  voidedAt: Date | null;
}

interface PrismaTicketReadRecord extends PrismaTicketRecord {
  order: {
    orderNumber: string;
  };
  concert: {
    title: string;
    startsAt: Date;
  };
  ticketType: {
    name: string;
    code: string;
  };
}

@Injectable()
export class PrismaTicketRepository implements TicketRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async issueTicketsForPaidOrder(data: IssueTicketsForPaidOrderData): Promise<Ticket[]> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, data.orderId);

      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: {
          items: true,
          tickets: {
            orderBy: { ticketNumber: 'asc' },
          },
        },
      });

      if (!order) {
        throw new TicketIssuanceOrderNotFoundError(data.orderId);
      }

      if (order.status !== OrderStatus.PAID) {
        throw new TicketIssuanceOrderNotPaidError(order.id);
      }

      const expectedTicketCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      if (order.tickets.length === expectedTicketCount) {
        return order.tickets.map((ticket) => this.toDomain(ticket));
      }

      if (order.tickets.length > expectedTicketCount) {
        throw new TicketPartialIssuanceConflictError(
          order.id,
          expectedTicketCount,
          order.tickets.length,
        );
      }

      const ticketPlans = data.createTickets(this.toPaidOrder(order));
      if (ticketPlans.length !== expectedTicketCount) {
        throw new TicketPartialIssuanceConflictError(
          order.id,
          expectedTicketCount,
          ticketPlans.length,
        );
      }

      const planByTicketNumber = new Map(
        ticketPlans.map((ticket) => [ticket.ticketNumber, ticket]),
      );
      for (const existingTicket of order.tickets) {
        if (!planByTicketNumber.has(existingTicket.ticketNumber)) {
          throw new TicketPartialIssuanceConflictError(
            order.id,
            expectedTicketCount,
            order.tickets.length,
          );
        }
      }

      const existingTicketNumbers = new Set(
        order.tickets.map((ticket) => ticket.ticketNumber),
      );
      const createdTickets: PrismaTicketRecord[] = [];
      for (const ticket of ticketPlans) {
        if (existingTicketNumbers.has(ticket.ticketNumber)) {
          continue;
        }
        createdTickets.push(
          await tx.ticket.create({
            data: {
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              orderId: order.id,
              orderItemId: ticket.orderItemId,
              userId: order.userId,
              concertId: order.concertId,
              ticketTypeId: ticket.ticketTypeId,
              qrTokenHash: ticket.qrTokenHash,
              status: PrismaTicketStatus.ISSUED,
              issuedAt: ticket.issuedAt,
            },
          }),
        );
      }

      return [...order.tickets, ...createdTickets]
        .sort((left, right) => left.ticketNumber.localeCompare(right.ticketNumber))
        .map((ticket) => this.toDomain(ticket));
    });
  }

  async findByUserId(userId: string): Promise<TicketSummary[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId },
      include: this.readIncludes(),
      orderBy: { issuedAt: 'desc' },
    });

    return tickets.map((ticket) => this.toSummary(ticket));
  }

  async findByUserIdAndId(
    userId: string,
    ticketId: string,
  ): Promise<TicketSummary | null> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: this.readIncludes(),
    });

    return ticket ? this.toSummary(ticket) : null;
  }

  private async lockOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM orders
      WHERE id = ${orderId}::uuid
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new TicketIssuanceOrderNotFoundError(orderId);
    }
  }

  private readIncludes() {
    return {
      order: {
        select: {
          orderNumber: true,
        },
      },
      concert: {
        select: {
          title: true,
          startsAt: true,
        },
      },
      ticketType: {
        select: {
          name: true,
          code: true,
        },
      },
    } satisfies Prisma.TicketInclude;
  }

  private toPaidOrder(order: {
    id: string;
    orderNumber: string;
    userId: string;
    concertId: string;
    status: string;
    items: Array<{
      id: string;
      ticketTypeId: string;
      quantity: number;
    }>;
  }): PaidOrderForTicketIssuance {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      concertId: order.concertId,
      status: order.status,
      items: order.items.map((item) => ({
        id: item.id,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      })),
    };
  }

  private toDomain(ticket: PrismaTicketRecord): Ticket {
    return new Ticket({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      orderId: ticket.orderId,
      orderItemId: ticket.orderItemId,
      userId: ticket.userId,
      concertId: ticket.concertId,
      ticketTypeId: ticket.ticketTypeId,
      qrTokenHash: ticket.qrTokenHash,
      status: ticket.status as TicketStatus,
      issuedAt: ticket.issuedAt,
      checkedInAt: ticket.checkedInAt,
      voidedAt: ticket.voidedAt,
    });
  }

  private toSummary(ticket: PrismaTicketReadRecord): TicketSummary {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      orderId: ticket.orderId,
      orderNumber: ticket.order.orderNumber,
      userId: ticket.userId,
      concertId: ticket.concertId,
      concertTitle: ticket.concert.title,
      concertStartsAt: ticket.concert.startsAt,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      ticketTypeCode: ticket.ticketType.code,
      status: ticket.status as TicketStatus,
      issuedAt: ticket.issuedAt,
      checkedInAt: ticket.checkedInAt,
    };
  }
}
