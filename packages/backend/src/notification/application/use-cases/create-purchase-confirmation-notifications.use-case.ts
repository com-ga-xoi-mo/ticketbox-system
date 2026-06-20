import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';
import type { NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type NotificationRecord,
} from '../../domain/notification.types';

export interface PurchaseConfirmationNotifications {
  inApp: NotificationRecord;
  email: NotificationRecord;
}

export class CreatePurchaseConfirmationNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepositoryPort) {}

  async execute(event: OrderPaidForNotification): Promise<PurchaseConfirmationNotifications> {
    const subject = `TicketBox confirmation: ${event.concertTitle}`;
    const body = this.buildBody(event);
    const sentAt = new Date(event.paidAt);

    const inApp = await this.notificationRepository.upsertByDedupeKey({
      userId: event.userId,
      concertId: event.concertId,
      channel: NotificationChannel.IN_APP,
      type: NotificationType.PURCHASE_CONFIRMATION,
      dedupeKey: this.dedupeKey(event.orderId, NotificationChannel.IN_APP),
      status: NotificationStatus.SENT,
      subject,
      body,
      sentAt,
    });

    const email = await this.notificationRepository.upsertByDedupeKey({
      userId: event.userId,
      concertId: event.concertId,
      channel: NotificationChannel.EMAIL,
      type: NotificationType.PURCHASE_CONFIRMATION,
      dedupeKey: this.dedupeKey(event.orderId, NotificationChannel.EMAIL),
      status: NotificationStatus.PENDING,
      subject,
      body,
    });

    return { inApp, email };
  }

  private dedupeKey(orderId: string, channel: NotificationChannel): string {
    const suffix = channel === NotificationChannel.IN_APP ? 'in-app' : 'email';
    return `purchase-confirmation:${orderId}:${suffix}`;
  }

  private buildBody(event: OrderPaidForNotification): string {
    const lines = [
      `Hi ${event.userDisplayName},`,
      `Your payment for ${event.concertTitle} is confirmed.`,
      `Tickets: ${event.ticketCount}`,
      `Concert starts at: ${event.startsAt}`,
      `View your e-tickets: ${event.ticketAccessUrl}`,
    ];

    return lines.join('\n');
  }
}
