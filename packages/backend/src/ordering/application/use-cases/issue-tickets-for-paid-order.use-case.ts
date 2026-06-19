import { randomUUID } from 'crypto';

import {
  TicketIssuanceOrderNotPaidError,
  TicketPartialIssuanceConflictError,
} from '../../domain/errors';
import { QrTicketTokenService } from '../../domain/qr-ticket-token.service';
import type { Ticket } from '../../domain/ticket.entity';
import { OrderStatus } from '../../domain/order-status.enum';
import type {
  PaidOrderForTicketIssuance,
  TicketIssuePlan,
  TicketRepositoryPort,
} from '../../domain/ports/ticket-repository.port';

export interface IssuedTicketResult {
  ticket: Ticket;
  qrPayload: string;
}

export interface IssueTicketsForPaidOrderCommand {
  orderId: string;
  issuedAt?: Date;
}

export class IssueTicketsForPaidOrderUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly qrTicketTokenService: QrTicketTokenService,
  ) {}

  async execute(command: IssueTicketsForPaidOrderCommand): Promise<IssuedTicketResult[]> {
    const issuedAt = command.issuedAt ?? new Date();
    const tickets = await this.ticketRepository.issueTicketsForPaidOrder({
      orderId: command.orderId,
      createTickets: (order) => this.createTicketPlans(order, issuedAt),
    });

    return tickets.map((ticket) => ({
      ticket,
      qrPayload: this.qrTicketTokenService.createPayload({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        orderId: ticket.orderId,
        userId: ticket.userId,
        concertId: ticket.concertId,
        issuedAt: ticket.issuedAt,
      }),
    }));
  }

  private createTicketPlans(
    order: PaidOrderForTicketIssuance,
    issuedAt: Date,
  ): TicketIssuePlan[] {
    if (order.status !== OrderStatus.PAID) {
      throw new TicketIssuanceOrderNotPaidError(order.id);
    }

    const plans: TicketIssuePlan[] = [];
    let sequence = 1;
    for (const item of order.items) {
      for (let index = 0; index < item.quantity; index += 1) {
        const ticketId = randomUUID();
        const ticketNumber = this.createTicketNumber(order.orderNumber, sequence);
        const qrPayload = this.qrTicketTokenService.createPayload({
          ticketId,
          ticketNumber,
          orderId: order.id,
          userId: order.userId,
          concertId: order.concertId,
          issuedAt,
        });

        plans.push({
          id: ticketId,
          ticketNumber,
          orderItemId: item.id,
          ticketTypeId: item.ticketTypeId,
          qrTokenHash: this.qrTicketTokenService.hashPayload(qrPayload),
          issuedAt,
        });
        sequence += 1;
      }
    }

    const expectedTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (plans.length !== expectedTickets) {
      throw new TicketPartialIssuanceConflictError(order.id, expectedTickets, plans.length);
    }

    return plans;
  }

  private createTicketNumber(orderNumber: string, sequence: number): string {
    const suffix = String(sequence).padStart(3, '0');
    const prefix = `TCK-${orderNumber}`;
    const maxPrefixLength = 80 - suffix.length - 1;
    return `${prefix.slice(0, maxPrefixLength)}-${suffix}`;
  }
}
