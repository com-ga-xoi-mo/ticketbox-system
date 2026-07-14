import type { Order } from '../order.entity';

export const INVENTORY_RESERVATION_REPOSITORY = Symbol(
  'IInventoryReservationRepository',
);

export interface IInventoryReservationRepository {
  reserve(order: Order): Promise<Order>;
}
