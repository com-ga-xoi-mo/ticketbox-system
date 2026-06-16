import type { OrderDomainEvent } from '../order-events';

export const ORDER_EVENT_PUBLISHER = Symbol('IOrderEventPublisher');

export interface IOrderEventPublisher {
  publishAll(events: OrderDomainEvent[]): Promise<void>;
}
