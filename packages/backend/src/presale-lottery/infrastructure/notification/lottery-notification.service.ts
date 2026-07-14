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
import { LotteryWinnerEmailComposer } from '../../application/services/lottery-entitlement-email-composer';
import type { LotteryDrawNotifier } from '../../application/use-cases/lottery.use-cases';
import type { PresaleLotteryRepositoryPort } from '../../domain/ports/presale-lottery-repository.port';

@Injectable()
export class LotteryNotificationService implements LotteryDrawNotifier {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly lotteryRepository: PresaleLotteryRepositoryPort,
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
    private readonly emailComposer: LotteryWinnerEmailComposer,
    private readonly config: Pick<
      PlatformConfigService,
      'emailMaxAttempts' | 'emailRetryBackoffMs'
    >,
  ) {}

  async notifyWinner(registrationId: string): Promise<void> {
    const context =
      await this.lotteryRepository.findWinnerNotificationContext(registrationId);
    if (!context) return;

    const actionUrl = `/events/${context.concertSlug}`;
    await this.notificationRepository.upsertByDedupeKey({
      userId: context.userId,
      concertId: context.concertId,
      channel: NotificationChannel.IN_APP,
      type: 'LOTTERY_WON',
      dedupeKey: `lottery-registration:${registrationId}:won`,
      status: NotificationStatus.SENT,
      subject: 'Bạn đã trúng bốc thăm mua vé',
      body:
        'Bạn đã trúng bốc thăm. Bạn được mua vé trong đợt presale, không có slot giữ chỗ riêng hay đồng hồ hết hạn cá nhân.',
      actionUrl,
      resourceType: NotificationResourceType.CONCERT,
      resourceId: context.concertId,
      metadata: {
        ticketTypeName: context.ticketTypeName,
        wonQuantity: context.wonQuantity,
        registrationId,
      },
      sentAt: new Date(),
    });

    const dedupeKey = `lottery-registration:${registrationId}:won:email`;
    const existing = await this.notificationRepository.findByDedupeKey?.(dedupeKey);
    if (existing) return;

    const content = this.emailComposer.compose(context);
    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId: context.userId,
      concertId: context.concertId,
      channel: NotificationChannel.EMAIL,
      type: 'LOTTERY_WON',
      dedupeKey,
      status: NotificationStatus.PENDING,
      subject: content.subject,
      body: content.body,
      actionUrl: content.actionUrl,
      resourceType: NotificationResourceType.CONCERT,
      resourceId: context.concertId,
      metadata: {
        ticketTypeName: context.ticketTypeName,
        wonQuantity: context.wonQuantity,
        registrationId,
      },
      scheduledAt: new Date(),
    });

    await this.deliveryQueue.add(
      NOTIFICATION_DELIVERY_JOB,
      { notificationId: notification.id, toEmail: context.userEmail },
      {
        jobId: this.buildDeliveryJobId(notification.id),
        attempts: this.config.emailMaxAttempts,
        backoff: { type: 'fixed', delay: this.config.emailRetryBackoffMs },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async notifyNotSelected(registrationId: string): Promise<void> {
    const context =
      await this.lotteryRepository.findNotSelectedNotificationContext(registrationId);
    if (!context) return;

    await this.notificationRepository.upsertByDedupeKey({
      userId: context.userId,
      concertId: context.concertId,
      channel: NotificationChannel.IN_APP,
      type: 'LOTTERY_NOT_SELECTED',
      dedupeKey: `lottery-registration:${registrationId}:not-selected`,
      status: NotificationStatus.SENT,
      subject: 'Kết quả bốc thăm mua vé',
      body: `Rất tiếc, bạn chưa trúng suất mua vé cho sự kiện ${context.concertTitle} trong đợt bốc thăm này.`,
      actionUrl: `/events/${context.concertSlug}`,
      resourceType: NotificationResourceType.CONCERT,
      resourceId: context.concertId,
      metadata: { ticketTypeName: context.ticketTypeName, registrationId },
      sentAt: new Date(),
    });
  }

  private buildDeliveryJobId(notificationId: string): string {
    return `lottery-deliver-${notificationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }
}
