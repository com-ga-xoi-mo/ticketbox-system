import type { OrderPaidForNotification } from '../events/order-paid-for-notification.event';

export const PURCHASE_CONFIRMATION_QUEUE_PORT = Symbol('PurchaseConfirmationQueuePort');

/**
 * Outbound port for enqueueing a purchase-confirmation job. Implemented by the
 * BullMQ producer in infrastructure so the application layer never imports a
 * queue client directly.
 */
export interface PurchaseConfirmationQueuePort {
  enqueueOrderPaid(event: OrderPaidForNotification): Promise<void>;
}
