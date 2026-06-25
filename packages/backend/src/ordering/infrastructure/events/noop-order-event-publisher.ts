import { Injectable, Logger } from '@nestjs/common';

import type { OrderDomainEvent } from '../../domain/order-events';
import type { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';

@Injectable()
export class NoopOrderEventPublisher implements IOrderEventPublisher {
  private readonly logger = new Logger(NoopOrderEventPublisher.name);

  async publishAll(events: OrderDomainEvent[]): Promise<void> {
    for (const event of events) {
      this.logger.debug(`Order domain event ignored by no-op publisher: ${event.type}`);
    }
  }
}
