import { Injectable } from '@nestjs/common';

import { IssueTicketsForPaidOrderUseCase } from '../../application/use-cases/issue-tickets-for-paid-order.use-case';
import { OrderStatus } from '../../domain/order-status.enum';
import type { OrderDomainEvent } from '../../domain/order-events';
import type { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';

@Injectable()
export class TicketIssuingOrderEventPublisher implements IOrderEventPublisher {
  constructor(
    private readonly issueTicketsForPaidOrderUseCase: IssueTicketsForPaidOrderUseCase,
  ) {}

  async publishAll(events: OrderDomainEvent[]): Promise<void> {
    for (const event of events) {
      if (event.type !== 'OrderPaid' || event.newStatus !== OrderStatus.PAID) {
        continue;
      }

      await this.issueTicketsForPaidOrderUseCase.execute({
        orderId: event.orderId,
        issuedAt: event.paidAt,
      });
    }
  }
}
