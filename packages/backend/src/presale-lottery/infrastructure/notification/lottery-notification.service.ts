import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { NOTIFICATION_DELIVERY_JOB } from '../../../platform/queue/platform-queue.constants';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
} from '../../../notification/domain/notification.types';
import type { NotificationRepositoryPort } from '../../../notification/domain/ports/notification-repository.port';
import type { NotificationDeliveryJobData } from '../../../notification/infrastructure/queue/notification-job.types';
import type { PresaleLotteryRepositoryPort } from '../../domain/ports/presale-lottery-repository.port';
import type { LotteryGrantNotifier } from '../../application/use-cases/lottery.use-cases';
import { LotteryEntitlementEmailComposer } from '../../application/services/lottery-entitlement-email-composer';
import type {
  LotteryEntitlementNotificationContext,
  LotteryEntitlementRecord,
} from '../../domain/lottery.types';

@Injectable()
export class LotteryNotificationService implements LotteryGrantNotifier {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly lotteryRepository: PresaleLotteryRepositoryPort,
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
    private readonly emailComposer: LotteryEntitlementEmailComposer,
    private readonly config: Pick<
      PlatformConfigService,
      'emailMaxAttempts' | 'emailRetryBackoffMs'
    >,
  ) {}

  async notifyEntitlementGranted(entitlement: LotteryEntitlementRecord): Promise<void> {
    const context = await this.lotteryRepository.findEntitlementNotificationContext(
      entitlement.id,
    );
    if (!context) return;

    await this.notificationRepository.upsertByDedupeKey({
      userId: entitlement.userId,
      concertId: entitlement.concertId,
      channel: NotificationChannel.IN_APP,
      type: 'LOTTERY_ENTITLEMENT_GRANTED',
      dedupeKey: `lottery-entitlement:${entitlement.id}:granted`,
      status: NotificationStatus.SENT,
      subject: 'Bạn đã trúng suất mua vé',
      body: 'Bạn đã trúng suất mua vé trong đợt bốc thăm. Hãy hoàn tất mua vé trước khi hết hạn.',
      actionUrl: this.buildAudienceActionUrl(context),
      resourceType: NotificationResourceType.LOTTERY_ENTITLEMENT,
      resourceId: entitlement.id,
      metadata: {
        ticketTypeId: entitlement.ticketTypeId,
        quantity: entitlement.quantity,
        expiresAt: entitlement.expiresAt.toISOString(),
      },
      sentAt: new Date(),
    });
    await this.enqueueEmail(entitlement, 'grant', context);
  }

  async notifyEntitlementExpiringSoon(entitlement: LotteryEntitlementRecord): Promise<void> {
    await this.enqueueEmail(entitlement, 'expiry-reminder');
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
      resourceType: NotificationResourceType.LOTTERY_ENTITLEMENT,
      resourceId: registrationId,
      metadata: { ticketTypeName: context.ticketTypeName },
      sentAt: new Date(),
    });
  }

  private async enqueueEmail(
    entitlement: LotteryEntitlementRecord,
    kind: 'grant' | 'expiry-reminder',
    knownContext?: LotteryEntitlementNotificationContext,
  ): Promise<void> {
    const dedupeKey = `lottery-entitlement:${entitlement.id}:${kind}:email`;
    const existing = await this.notificationRepository.findByDedupeKey?.(dedupeKey);
    if (existing) return;

    const context =
      knownContext ??
      (await this.lotteryRepository.findEntitlementNotificationContext(entitlement.id));
    if (!context) return;

    const content = this.emailComposer.compose(context, kind);
    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId: entitlement.userId,
      concertId: entitlement.concertId,
      channel: NotificationChannel.EMAIL,
      type:
        kind === 'grant'
          ? 'LOTTERY_ENTITLEMENT_GRANTED'
          : 'LOTTERY_ENTITLEMENT_EXPIRING_SOON',
      dedupeKey,
      status: NotificationStatus.PENDING,
      subject: content.subject,
      body: content.body,
      actionUrl: content.actionUrl,
      resourceType: NotificationResourceType.LOTTERY_ENTITLEMENT,
      resourceId: entitlement.id,
      metadata: {
        ticketTypeId: entitlement.ticketTypeId,
        quantity: entitlement.quantity,
        expiresAt: entitlement.expiresAt.toISOString(),
        notificationKind: kind,
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
        backoff: { type: 'fixed', delay: this.config.emailRetryBackoffMs },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  private buildAudienceActionUrl(context: LotteryEntitlementNotificationContext): string {
    const params = new URLSearchParams({ lotteryEntitlementId: context.entitlement.id });
    return `/events/${context.concertSlug}?${params.toString()}`;
  }

  private buildDeliveryJobId(notificationId: string): string {
    return `lottery-deliver-${notificationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }
}
