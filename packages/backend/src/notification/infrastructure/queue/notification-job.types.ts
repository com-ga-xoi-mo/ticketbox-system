import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';

export type PurchaseConfirmationJobData = OrderPaidForNotification;

export interface NotificationDeliveryJobData {
  notificationId: string;
  toEmail: string;
  orderId?: string;
}

/** Empty payload: the repeatable scan derives its own time window at run time. */
export type ConcertReminderScanJobData = Record<string, never>;
