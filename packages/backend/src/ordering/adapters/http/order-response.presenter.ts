import type { Order } from '../../domain/order.entity';

export function serializeOrder(order: Order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    concertId: order.concertId,
    idempotencyKey: order.idempotencyKey,
    status: order.status,
    totalAmountVnd: order.totalAmountVnd,
    reservationExpiresAt: order.reservationExpiresAt,
    paidAt: order.paidAt,
    expiredAt: order.expiredAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      ticketTypeId: item.ticketTypeId,
      ticketTypeName: item.ticketTypeName,
      quantity: item.quantity,
      unitPriceVnd: item.unitPriceVnd,
      totalPriceVnd: item.totalPriceVnd,
    })),
  };
}
