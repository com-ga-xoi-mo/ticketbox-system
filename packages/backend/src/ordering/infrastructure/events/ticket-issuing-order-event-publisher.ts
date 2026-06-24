import { Injectable, Logger } from '@nestjs/common';

import { IssueTicketsForPaidOrderUseCase } from '../../application/use-cases/issue-tickets-for-paid-order.use-case';
import { OrderStatus } from '../../domain/order-status.enum';
import type { OrderDomainEvent } from '../../domain/order-events';
import type { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';
import type { OrderPaidNotifierPort } from '../../domain/ports/order-paid-notifier.port';

@Injectable()
export class TicketIssuingOrderEventPublisher implements IOrderEventPublisher {
  private readonly logger = new Logger(TicketIssuingOrderEventPublisher.name);

  constructor(
    private readonly issueTicketsForPaidOrderUseCase: IssueTicketsForPaidOrderUseCase,
    private readonly orderPaidNotifier: OrderPaidNotifierPort,
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

      // Best-effort: a confirmation enqueue failure must never roll back the
      // already-committed paid order or its issued tickets.
      try {
        await this.orderPaidNotifier.notifyOrderPaid(event.orderId, event.paidAt);
      } catch (error) {
        this.logger.error(
          `Failed to enqueue purchase confirmation for order ${event.orderId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
