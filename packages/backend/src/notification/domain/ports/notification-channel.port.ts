import type { DeliveryRequest, DeliveryResult } from '../notification.types';

export const EMAIL_NOTIFICATION_CHANNEL = Symbol('EmailNotificationChannelPort');

export interface NotificationChannelPort {
  send(request: DeliveryRequest): Promise<DeliveryResult>;
}
