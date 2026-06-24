export const ORDER_PAID_NOTIFIER = Symbol('OrderPaidNotifier');

/**
 * Outbound port the paid-order flow uses to signal that an order has been paid
 * and its tickets issued, so a purchase confirmation can be enqueued. Implemented
 * at the composition root by delegating to the notification module — ordering does
 * not depend on notification internals.
 */
export interface OrderPaidNotifierPort {
  notifyOrderPaid(orderId: string, paidAt: Date): Promise<void>;
}
