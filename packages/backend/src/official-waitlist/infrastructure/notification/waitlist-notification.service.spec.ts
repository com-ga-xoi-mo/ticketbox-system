import { describe, expect, it, vi } from 'vitest';

import {
  NotificationChannel,
  NotificationStatus,
  type NotificationRecord,
} from '../../../notification/domain/notification.types';
import type { NotificationRepositoryPort } from '../../../notification/domain/ports/notification-repository.port';
import { NOTIFICATION_DELIVERY_JOB } from '../../../platform/queue/platform-queue.constants';
import { WaitlistEntitlementEmailComposer } from '../../application/services/waitlist-entitlement-email-composer';
import type { OfficialWaitlistRepositoryPort } from '../../domain/ports/official-waitlist-repository.port';
import type {
  PurchaseEntitlementRecord,
  WaitlistEntitlementNotificationContext,
} from '../../domain/waitlist.types';
import { WaitlistNotificationService } from './waitlist-notification.service';

function entitlement(
  overrides: Partial<PurchaseEntitlementRecord> = {},
): PurchaseEntitlementRecord {
  return {
    id: 'entitlement-1',
    waitlistEntryId: 'entry-1',
    userId: 'user-1',
    concertId: 'concert-1',
    ticketTypeId: 'ticket-type-1',
    orderId: null,
    source: 'WAITLIST',
    status: 'ACTIVE',
    quantity: 1,
    grantedAt: new Date('2026-07-08T10:00:00.000Z'),
    expiresAt: new Date('2026-07-08T10:15:00.000Z'),
    consumedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function notificationRecord(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: `notification-${Math.random().toString(36).slice(2)}`,
    userId: 'user-1',
    concertId: 'concert-1',
    channel: NotificationChannel.EMAIL,
    type: 'WAITLIST_ENTITLEMENT_GRANTED',
    dedupeKey: 'waitlist-entitlement:entitlement-1:grant:email',
    status: NotificationStatus.PENDING,
    subject: 'Den luot mua ve tu danh sach cho TicketBox',
    body: 'body',
    actionUrl: '/events/concert-slug',
    resourceType: 'WAITLIST_ENTITLEMENT',
    resourceId: 'entitlement-1',
    metadata: null,
    readAt: null,
    scheduledAt: null,
    sentAt: null,
    failedAttemptCount: 0,
    ...overrides,
  };
}

function context(
  record: PurchaseEntitlementRecord = entitlement(),
): WaitlistEntitlementNotificationContext {
  return {
    entitlement: record,
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
  contextResult?: WaitlistEntitlementNotificationContext | null;
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
  const waitlistRepository = {
    findEntitlementNotificationContext: vi
      .fn()
      .mockResolvedValue(overrides.contextResult ?? context()),
  } as unknown as OfficialWaitlistRepositoryPort;

  return {
    repository,
    waitlistRepository,
    queueAdd,
    service: new WaitlistNotificationService(
      repository,
      waitlistRepository,
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
  it('persists in-app grant notification and enqueues grant email delivery', async () => {
    const { service, repository, queueAdd } = makeService();

    await service.notifyEntitlementGranted(entitlement());

    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.IN_APP,
        dedupeKey: 'waitlist-entitlement:entitlement-1:granted',
        actionUrl:
          '/events/anh-trai-say-hi-2026?waitlistEntitlementId=entitlement-1',
      }),
    );
    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        dedupeKey: 'waitlist-entitlement:entitlement-1:grant:email',
        status: NotificationStatus.PENDING,
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

  it('does not hide the in-app grant when email enqueue fails', async () => {
    const { service, repository } = makeService({
      queueAdd: vi.fn().mockRejectedValue(new Error('redis down')),
    });

    await expect(service.notifyEntitlementGranted(entitlement())).rejects.toThrow(
      'redis down',
    );
    expect(repository.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({ channel: NotificationChannel.IN_APP }),
    );
  });

  it('enqueues one near-expiry reminder email', async () => {
    const { service, queueAdd } = makeService();

    await service.notifyEntitlementExpiringSoon(entitlement());

    expect(queueAdd).toHaveBeenCalledWith(
      NOTIFICATION_DELIVERY_JOB,
      expect.any(Object),
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

  it('does not enqueue duplicate near-expiry reminder emails', async () => {
    const { service, repository, queueAdd } = makeService({
      existingNotification: notificationRecord({
        dedupeKey: 'waitlist-entitlement:entitlement-1:expiry-reminder:email',
      }),
    });

    await service.notifyEntitlementExpiringSoon(entitlement());

    expect(repository.upsertByDedupeKey).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
