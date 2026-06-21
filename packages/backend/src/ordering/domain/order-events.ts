import type { OrderStatus } from './order-status.enum';

export interface BaseOrderDomainEvent {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  occurredAt: Date;
}

export interface OrderPaid extends BaseOrderDomainEvent {
  type: 'OrderPaid';
  newStatus: OrderStatus.PAID;
  paidAt: Date;
}

export interface OrderExpired extends BaseOrderDomainEvent {
  type: 'OrderExpired';
  newStatus: OrderStatus.EXPIRED;
  expiredAt: Date;
}

export interface OrderFailed extends BaseOrderDomainEvent {
  type: 'OrderFailed';
  newStatus: OrderStatus.FAILED;
  failedAt: Date;
}

export interface OrderCancelled extends BaseOrderDomainEvent {
  type: 'OrderCancelled';
  newStatus: OrderStatus.CANCELLED;
  cancelledAt: Date;
}

export interface OrderRefunded extends BaseOrderDomainEvent {
  type: 'OrderRefunded';
  newStatus: OrderStatus.REFUNDED;
  refundedAt: Date;
}

export type OrderDomainEvent =
  | OrderPaid
  | OrderExpired
  | OrderFailed
  | OrderCancelled
  | OrderRefunded;
