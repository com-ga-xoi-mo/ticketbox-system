import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  NOTIFICATION_DELIVERY_JOB,
} from '../../../platform/queue/platform-queue.constants';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
} from '../../../notification/domain/notification.types';
import type { NotificationRepositoryPort } from '../../../notification/domain/ports/notification-repository.port';
import type { NotificationDeliveryJobData } from '../../../notification/infrastructure/queue/notification-job.types';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type { WaitlistGrantNotifier } from '../../application/use-cases/waitlist.use-cases';
import { WaitlistEntitlementEmailComposer } from '../../application/services/waitlist-entitlement-email-composer';
import type {
  PurchaseEntitlementRecord,
  WaitlistEntitlementNotificationContext,
} from '../../domain/waitlist.types';

@Injectable()
export class WaitlistNotificationService implements WaitlistGrantNotifier {
  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly waitlistRepository: OfficialWaitlistRepositoryPort,
    private readonly deliveryQueue: Queue<NotificationDeliveryJobData>,
    private readonly emailComposer: WaitlistEntitlementEmailComposer,
    private readonly config: Pick<
      PlatformConfigService,
      'emailMaxAttempts' | 'emailRetryBackoffMs'
    >,
  ) {}

  async notifyEntitlementGranted(
    entitlement: PurchaseEntitlementRecord,
  ): Promise<void> {
    const context = await this.waitlistRepository.findEntitlementNotificationContext(
      entitlement.id,
    );
    if (!context) return;

    await this.notificationRepository.upsertByDedupeKey({
      userId: entitlement.userId,
      concertId: entitlement.concertId,
      channel: NotificationChannel.IN_APP,
      type: 'WAITLIST_ENTITLEMENT_GRANTED',
      dedupeKey: `waitlist-entitlement:${entitlement.id}:granted`,
      status: NotificationStatus.SENT,
      subject: 'Đến lượt mua vé',
      body: 'Bạn đã nhận được quyền mua vé trong thời gian giới hạn.',
      actionUrl: this.buildAudienceActionUrl(context),
      resourceType: NotificationResourceType.WAITLIST_ENTITLEMENT,
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

  async notifyEntitlementExpiringSoon(
    entitlement: PurchaseEntitlementRecord,
  ): Promise<void> {
    await this.enqueueEmail(entitlement, 'expiry-reminder');
  }

  private async enqueueEmail(
    entitlement: PurchaseEntitlementRecord,
    kind: 'grant' | 'expiry-reminder',
    knownContext?: WaitlistEntitlementNotificationContext,
  ): Promise<void> {
    const dedupeKey = `waitlist-entitlement:${entitlement.id}:${kind}:email`;
    const existing = await this.notificationRepository.findByDedupeKey?.(dedupeKey);
    if (existing) return;

    const context =
      knownContext ??
      (await this.waitlistRepository.findEntitlementNotificationContext(
        entitlement.id,
      ));
    if (!context) return;

    const content = this.emailComposer.compose(context, kind);
    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId: entitlement.userId,
      concertId: entitlement.concertId,
      channel: NotificationChannel.EMAIL,
      type:
        kind === 'grant'
          ? 'WAITLIST_ENTITLEMENT_GRANTED'
          : 'WAITLIST_ENTITLEMENT_EXPIRING_SOON',
      dedupeKey,
      status: NotificationStatus.PENDING,
      subject: content.subject,
      body: content.body,
      actionUrl: content.actionUrl,
      resourceType: NotificationResourceType.WAITLIST_ENTITLEMENT,
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
        backoff: {
          type: 'fixed',
          delay: this.config.emailRetryBackoffMs,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  private buildAudienceActionUrl(
    context: WaitlistEntitlementNotificationContext,
  ): string {
    const params = new URLSearchParams({
      waitlistEntitlementId: context.entitlement.id,
    });
    return `/events/${context.concertSlug}?${params.toString()}`;
  }

  private buildDeliveryJobId(notificationId: string): string {
    return `waitlist-deliver-${notificationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }
}
