import { describe, expect, it, vi } from 'vitest';

import type { NotificationRepositoryPort } from '../../../notification/domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
  type NotificationRecord,
} from '../../../notification/domain/notification.types';
import { NOTIFICATION_DELIVERY_JOB } from '../../../platform/queue/platform-queue.constants';
import { WaitlistEntitlementEmailComposer } from '../../application/services/waitlist-entitlement-email-composer';
import type { WaitlistRecoveryNotificationContext } from '../../domain/waitlist.types';
import { WaitlistNotificationService } from './waitlist-notification.service';

function notificationRecord(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'notification-1',
    userId: 'user-1',
    concertId: 'concert-1',
    channel: NotificationChannel.EMAIL,
    type: 'WAITLIST_TICKET_AVAILABLE',
    dedupeKey: 'waitlist-recovery:entry-1:email',
    status: NotificationStatus.PENDING,
    subject: 'Vé bạn chờ đã quay lại TicketBox',
    body: 'body',
    actionUrl: '/events/concert-slug',
    resourceType: NotificationResourceType.CONCERT,
    resourceId: 'concert-1',
    metadata: null,
    readAt: null,
    scheduledAt: null,
    sentAt: null,
    failedAttemptCount: 0,
    ...overrides,
  };
}

function context(): WaitlistRecoveryNotificationContext {
  return {
    entry: {
      id: 'entry-1',
      userId: 'user-1',
      concertId: 'concert-1',
      ticketTypeId: 'ticket-type-1',
      desiredQuantity: 1,
      status: 'WAITING',
      joinedAt: new Date('2026-07-08T10:00:00.000Z'),
      cancelledAt: null,
    },
    userEmail: 'audience@ticketbox.test',
    userDisplayName: 'TicketBox Audience',
    concertTitle: 'Anh Trai Say Hi Live Concert',
    concertSlug: 'anh-trai-say-hi-2026',
    ticketTypeName: 'SVIP',
    ticketTypeCode: 'SVIP',
  };
}

function makeService(overrides: {
  existingNotification?: NotificationRecord | null;
  queueAdd?: ReturnType<typeof vi.fn>;
} = {}) {
  const queueAdd = overrides.queueAdd ?? vi.fn().mockResolvedValue(undefined);
  const repository: NotificationRepositoryPort = {
    upsertByDedupeKey: vi.fn(async (input) =>
      notificationRecord({
        id: `${input.channel.toLowerCase()}-${input.dedupeKey}`,
        channel: input.channel,
        type: input.type,
        dedupeKey: input.dedupeKey,
        status: input.status,
        subject: input.subject ?? null,
        body: input.body,
        actionUrl: input.actionUrl ?? null,
      }),
    ),
    findByDedupeKey: vi.fn().mockResolvedValue(overrides.existingNotification ?? null),
    findById: vi.fn(),
    recordDeliveryAttempt: vi.fn(),
    updateStatus: vi.fn(),
  };

  return {
    repository,
    queueAdd,
    service: new WaitlistNotificationService(
      repository,
      { add: queueAdd } as never,
      new WaitlistEntitlementEmailComposer('http://localhost:5174'),
      {
        emailMaxAttempts: 3,
        emailRetryBackoffMs: 5000,
      },
    ),
  };
}

describe('WaitlistNotificationService', () => {
  it('persists in-app recovery notification and enqueues recovery email', async () => {
    const { service, repository, queueAdd } = makeService();

    await service.notifyAvailabilityRecovered(
      context(),
      new Date('2026-07-08T10:05:00.000Z'),
    );

    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        type: 'WAITLIST_TICKET_AVAILABLE',
        resourceType: NotificationResourceType.CONCERT,
        actionUrl: 'http://localhost:5174/events/anh-trai-say-hi-2026',
      }),
    );
    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        subject: 'Vé bạn chờ đã quay lại TicketBox',
      }),
    );
    expect(queueAdd).toHaveBeenCalledWith(
      NOTIFICATION_DELIVERY_JOB,
      expect.objectContaining({
        toEmail: 'audience@ticketbox.test',
      }),
      expect.objectContaining({
        jobId: expect.stringMatching(/^waitlist-deliver-/),
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      }),
    );
    const [, , options] = queueAdd.mock.calls[0];
    expect(options.jobId).not.toContain(':');
  });

  it('does not enqueue duplicate recovery emails', async () => {
    const { service, repository, queueAdd } = makeService({
      existingNotification: notificationRecord(),
    });

    await service.notifyAvailabilityRecovered(
      context(),
      new Date('2026-07-08T10:05:00.000Z'),
    );

    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({ channel: NotificationChannel.IN_APP }),
    );
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
