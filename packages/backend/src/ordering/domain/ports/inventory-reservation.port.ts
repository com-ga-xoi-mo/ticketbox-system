import type { Order } from '../order.entity';

export const INVENTORY_RESERVATION_REPOSITORY = Symbol(
  'IInventoryReservationRepository',
);

export interface InventoryReservationOptions {
  waitlistEntitlementId?: string;
}

export interface IInventoryReservationRepository {
  reserve(order: Order, options?: InventoryReservationOptions): Promise<Order>;
}
