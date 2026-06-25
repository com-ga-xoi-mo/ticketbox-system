import { InvalidOrderTransitionError } from './errors';
import type { OrderDomainEvent } from './order-events';
import type { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';

export interface OrderProps {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  idempotencyKey?: string | null;
  status: OrderStatus;
  subtotalVnd?: number;
  discountAmountVnd?: number;
  serviceFeeVnd?: number;
  totalAmountVnd: number;
  promoCode?: string | null;
  promotionId?: string | null;
  reservationExpiresAt?: Date | null;
  paidAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export class Order {
  private static readonly allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
    [OrderStatus.PENDING_PAYMENT]: [
      OrderStatus.PAID,
      OrderStatus.EXPIRED,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAID]: [OrderStatus.REFUNDED],
    [OrderStatus.EXPIRED]: [],
    [OrderStatus.FAILED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
  };

  readonly id: string;
  readonly orderNumber: string;
  readonly userId: string;
  readonly concertId: string;
  readonly idempotencyKey: string | null;
  readonly subtotalVnd: number;
  readonly discountAmountVnd: number;
  readonly serviceFeeVnd: number;
  readonly totalAmountVnd: number;
  readonly promoCode: string | null;
  readonly promotionId: string | null;
  readonly reservationExpiresAt: Date | null;
  readonly createdAt: Date;
  readonly items: OrderItem[];

  status: OrderStatus;
  paidAt: Date | null;
  expiredAt: Date | null;
  cancelledAt: Date | null;
  updatedAt: Date;
  domainEvents: OrderDomainEvent[] = [];

  constructor(props: OrderProps) {
    this.id = props.id;
    this.orderNumber = props.orderNumber;
    this.userId = props.userId;
    this.concertId = props.concertId;
    this.idempotencyKey = props.idempotencyKey ?? null;
    this.status = props.status;
    this.subtotalVnd = props.subtotalVnd ?? 0;
    this.discountAmountVnd = props.discountAmountVnd ?? 0;
    this.serviceFeeVnd = props.serviceFeeVnd ?? 0;
    this.totalAmountVnd = props.totalAmountVnd;
    this.promoCode = props.promoCode ?? null;
    this.promotionId = props.promotionId ?? null;
    this.reservationExpiresAt = props.reservationExpiresAt ?? null;
    this.paidAt = props.paidAt ?? null;
    this.expiredAt = props.expiredAt ?? null;
    this.cancelledAt = props.cancelledAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.items = props.items ?? [];
  }

  transition(nextStatus: OrderStatus, occurredAt = new Date()): void {
    const previousStatus = this.status;
    const allowedTargets = Order.allowedTransitions[previousStatus];

    if (!allowedTargets.includes(nextStatus)) {
      throw new InvalidOrderTransitionError(previousStatus, nextStatus);
    }

    this.status = nextStatus;
    this.updatedAt = occurredAt;

    switch (nextStatus) {
      case OrderStatus.PAID:
        this.paidAt = occurredAt;
        this.recordDomainEvent({
          type: 'OrderPaid',
          orderId: this.id,
          promotionId: this.promotionId,
          previousStatus,
          newStatus: nextStatus,
          paidAt: occurredAt,
          occurredAt,
        });
        break;
      case OrderStatus.EXPIRED:
        this.expiredAt = occurredAt;
        this.recordDomainEvent({
          type: 'OrderExpired',
          orderId: this.id,
          promotionId: this.promotionId,
          previousStatus,
          newStatus: nextStatus,
          expiredAt: occurredAt,
          occurredAt,
        });
        break;
      case OrderStatus.FAILED:
        this.recordDomainEvent({
          type: 'OrderFailed',
          orderId: this.id,
          promotionId: this.promotionId,
          previousStatus,
          newStatus: nextStatus,
          failedAt: occurredAt,
          occurredAt,
        });
        break;
      case OrderStatus.CANCELLED:
        this.cancelledAt = occurredAt;
        this.recordDomainEvent({
          type: 'OrderCancelled',
          orderId: this.id,
          promotionId: this.promotionId,
          previousStatus,
          newStatus: nextStatus,
          cancelledAt: occurredAt,
          occurredAt,
        });
        break;
      case OrderStatus.REFUNDED:
        this.recordDomainEvent({
          type: 'OrderRefunded',
          orderId: this.id,
          promotionId: this.promotionId,
          previousStatus,
          newStatus: nextStatus,
          refundedAt: occurredAt,
          occurredAt,
        });
        break;
    }
  }

  clearEvents(): void {
    this.domainEvents = [];
  }

  private recordDomainEvent(event: OrderDomainEvent): void {
    this.domainEvents.push(event);
  }
}
