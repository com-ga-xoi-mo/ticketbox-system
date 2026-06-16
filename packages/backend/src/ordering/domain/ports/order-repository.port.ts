import type { Order } from '../order.entity';
import type { OrderStatus } from '../order-status.enum';

export const ORDER_REPOSITORY = Symbol('IOrderRepository');

export interface UpdateOrderStatusData {
  orderId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
  updatedAt: Date;
  paidAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface IOrderRepository {
  create(order: Order): Promise<Order>;

  findById(orderId: string): Promise<Order | null>;

  findByUserId(userId: string): Promise<Order[]>;

  findByUserIdAndIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null>;

  updateStatus(data: UpdateOrderStatusData): Promise<Order>;
}
