import type { Order } from '../order.entity';
import type { OrderStatus } from '../order-status.enum';

export const INVENTORY_ADJUSTMENT_REPOSITORY = Symbol(
  'IInventoryAdjustmentRepository',
);

export interface InventoryAdjustmentData {
  orderId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
  updatedAt: Date;
  paidAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface IInventoryAdjustmentRepository {
  applyStatusTransition(data: InventoryAdjustmentData): Promise<Order>;
}
