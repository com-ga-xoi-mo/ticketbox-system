import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import type { NotificationRepositoryPort } from '../../../notification/domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
} from '../../../notification/domain/notification.types';
import type { NotificationDeliveryJobData } from '../../../notification/infrastructure/queue/notification-job.types';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { NOTIFICATION_DELIVERY_JOB } from '../../../platform/queue/platform-queue.constants';
import { WaitlistEntitlementEmailComposer } from '../../application/services/waitlist-entitlement-email-composer';
import type { WaitlistGrantNotifier } from '../../application/use-cases/waitlist.use-cases';
import type { WaitlistRecoveryNotificationContext } from '../../domain/waitlist.types';

@Injectable()
export class WaitlistNotificationService implements WaitlistGrantNotifier {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
    private readonly emailComposer: WaitlistEntitlementEmailComposer,
    private readonly config: Pick<
      PlatformConfigService,
      'emailMaxAttempts' | 'emailRetryBackoffMs'
    >,
  ) {}

  async notifyAvailabilityRecovered(
    context: WaitlistRecoveryNotificationContext,
    notifiedAt: Date,
  ): Promise<void> {
    const dedupeKey = `waitlist-recovery:${context.entry.id}:${notifiedAt.toISOString()}`;
    const content = this.emailComposer.composeRecovery(context);

    await this.notificationRepository.upsertByDedupeKey({
      userId: context.entry.userId,
      concertId: context.entry.concertId,
      channel: NotificationChannel.IN_APP,
      type: 'WAITLIST_TICKET_AVAILABLE',
      dedupeKey: `${dedupeKey}:in-app`,
      status: NotificationStatus.SENT,
      subject: 'Vé bạn chờ đã quay lại',
      body:
        'Vé bạn đăng ký theo dõi vừa quay lại public sale. Vé không được giữ riêng, hãy vào mua ngay nếu vẫn còn nhu cầu.',
      actionUrl: content.actionUrl,
      resourceType: NotificationResourceType.CONCERT,
      resourceId: context.entry.concertId,
      metadata: {
        ticketTypeId: context.entry.ticketTypeId,
        waitlistEntryId: context.entry.id,
      },
      sentAt: notifiedAt,
    });

    await this.enqueueEmail(context, content, dedupeKey);
  }

  private async enqueueEmail(
    context: WaitlistRecoveryNotificationContext,
    content: { subject: string; body: string; actionUrl: string },
    dedupeKey: string,
  ): Promise<void> {
    const emailDedupeKey = `${dedupeKey}:email`;
    const existing = await this.notificationRepository.findByDedupeKey?.(
      emailDedupeKey,
    );
    if (existing) return;

    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId: context.entry.userId,
      concertId: context.entry.concertId,
      channel: NotificationChannel.EMAIL,
      type: 'WAITLIST_TICKET_AVAILABLE',
      dedupeKey: emailDedupeKey,
      status: NotificationStatus.PENDING,
      subject: content.subject,
      body: content.body,
      actionUrl: content.actionUrl,
      resourceType: NotificationResourceType.CONCERT,
      resourceId: context.entry.concertId,
      metadata: {
        ticketTypeId: context.entry.ticketTypeId,
        waitlistEntryId: context.entry.id,
      },
      scheduledAt: new Date(),
    });

    await this.deliveryQueue.add(
      NOTIFICATION_DELIVERY_JOB,
      {
        notificationId: notification.id,
        toEmail: context.userEmail,
      },
      {
        jobId: this.buildDeliveryJobId(notification.id),
        attempts: this.config.emailMaxAttempts,
        backoff: {
          type: 'fixed',
          delay: this.config.emailRetryBackoffMs,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  private buildDeliveryJobId(notificationId: string): string {
    return `waitlist-deliver-${notificationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }
}
