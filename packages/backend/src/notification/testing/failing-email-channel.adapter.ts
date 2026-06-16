import type { NotificationChannelPort } from '../domain/ports/notification-channel.port';
import type { DeliveryResult } from '../domain/notification.types';

export class FailingEmailChannelAdapter implements NotificationChannelPort {
  constructor(private readonly errorMessage = 'Transient email failure') {}

  async send(): Promise<DeliveryResult> {
    throw new Error(this.errorMessage);
  }
}
