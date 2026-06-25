import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import type { NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import type { PurchaseConfirmationEmailComposer } from '../services/purchase-confirmation-email-composer';
import {
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type NotificationDeliveryContext,
  type DeliveryOutcome,
  type NotificationRecord,
} from '../../domain/notification.types';

export class DeliverNotificationUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly emailChannel: NotificationChannelPort,
    private readonly maxAttempts: number,
    private readonly purchaseConfirmationComposer?: PurchaseConfirmationEmailComposer,
  ) {}

  async execute(
    notificationId: string,
    toEmail?: string,
    context?: NotificationDeliveryContext,
  ): Promise<DeliveryOutcome> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      return {
        notificationId,
        status: NotificationStatus.FAILED,
        shouldRetry: false,
        skippedReason: 'notification-not-found',
      };
    }

    if (notification.status === NotificationStatus.SENT) {
      return {
        notificationId,
        status: NotificationStatus.SENT,
        shouldRetry: false,
        skippedReason: 'already-sent',
      };
    }

    if (notification.channel === NotificationChannel.IN_APP) {
      const sent = await this.notificationRepository.updateStatus({
        notificationId,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      return { notificationId, status: sent.status, shouldRetry: false };
    }

    return this.deliverEmail(notification, toEmail, context);
  }

  private async deliverEmail(
    notification: NotificationRecord,
    toEmail?: string,
    context?: NotificationDeliveryContext,
  ): Promise<DeliveryOutcome> {
    if (!toEmail) {
      const attempt = await this.notificationRepository.recordDeliveryAttempt({
        notificationId: notification.id,
        status: NotificationAttemptStatus.FAILED,
        provider: 'local',
        errorMessage: 'Recipient email is required for email notification delivery',
      });
      const failed = await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status: NotificationStatus.FAILED,
      });
      return {
        notificationId: notification.id,
        status: failed.status,
        attempt,
        shouldRetry: false,
      };
    }

    if (notification.failedAttemptCount >= this.maxAttempts) {
      const failed = await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status: NotificationStatus.FAILED,
      });
      return {
        notificationId: notification.id,
        status: failed.status,
        shouldRetry: false,
        skippedReason: 'max-attempts-exhausted',
      };
    }

    try {
      const content =
        notification.type === NotificationType.PURCHASE_CONFIRMATION &&
        context?.orderId &&
        this.purchaseConfirmationComposer
          ? await this.purchaseConfirmationComposer.compose(context.orderId, notification.body)
          : { body: notification.body, attachments: undefined };

      const result = await this.emailChannel.send({
        notificationId: notification.id,
        channel: NotificationChannel.EMAIL,
        toUserId: notification.userId,
        toEmail,
        subject: notification.subject ?? 'TicketBox notification',
        body: content.body,
        attachments: content.attachments,
      });

      const attempt = await this.notificationRepository.recordDeliveryAttempt({
        notificationId: notification.id,
        status: NotificationAttemptStatus.SUCCEEDED,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
      });
      const sent = await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      return { notificationId: notification.id, status: sent.status, attempt, shouldRetry: false };
    } catch (error: unknown) {
      const failedAttemptCount = notification.failedAttemptCount + 1;
      const shouldRetry = failedAttemptCount < this.maxAttempts;
      const attempt = await this.notificationRepository.recordDeliveryAttempt({
        notificationId: notification.id,
        status: NotificationAttemptStatus.FAILED,
        provider: 'local',
        errorMessage: error instanceof Error ? error.message : 'Unknown email failure',
      });

      const status = shouldRetry ? NotificationStatus.PENDING : NotificationStatus.FAILED;
      const updated = await this.notificationRepository.updateStatus({
        notificationId: notification.id,
        status,
      });

      return {
        notificationId: notification.id,
        status: updated.status,
        attempt,
        shouldRetry,
      };
    }
  }
}
