import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';

export type PurchaseConfirmationJobData = OrderPaidForNotification;

export interface NotificationDeliveryJobData {
  notificationId: string;
  toEmail: string;
}
