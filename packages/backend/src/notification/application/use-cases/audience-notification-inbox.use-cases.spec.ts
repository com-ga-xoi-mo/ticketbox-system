import { beforeEach, describe, expect, it } from 'vitest';

import type { NotificationRepositoryPort } from '../../domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  type DeliveryAttemptRecord,
  type NotificationRecord,
} from '../../domain/notification.types';
import {
  GetAudienceUnreadNotificationCountUseCase,
  ListAudienceNotificationsUseCase,
  MarkAllAudienceNotificationsReadUseCase,
  MarkAudienceNotificationReadUseCase,
} from './audience-notification-inbox.use-cases';

const now = new Date('2026-06-25T05:00:00.000Z');

function notification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'notification-1',
    userId: 'user-1',
    concertId: null,
    channel: NotificationChannel.IN_APP,
    type: 'REFUND_UPDATE',
    dedupeKey: 'refund:1',
    status: NotificationStatus.SENT,
    subject: 'Refund update',
    body: 'Your refund request is under review.',
    actionUrl: '/account/support/refunds/refund-1',
    resourceType: 'REFUND_REQUEST',
    resourceId: 'refund-1',
    metadata: undefined,
    readAt: null,
    scheduledAt: null,
    sentAt: now,
    createdAt: now,
    updatedAt: now,
    failedAttemptCount: 0,
    ...overrides,
  };
}

class FakeNotificationRepository implements NotificationRepositoryPort {
  notifications: NotificationRecord[] = [
    notification(),
    notification({ id: 'notification-2', readAt: now, type: 'SUPPORT_UPDATE' }),
  ];

  async upsertByDedupeKey(): Promise<NotificationRecord> {
    throw new Error('not used');
  }

  async findById(): Promise<NotificationRecord | null> {
    throw new Error('not used');
  }

  async listInbox(input: { unreadOnly?: boolean; type?: string }): Promise<NotificationRecord[]> {
    return this.notifications.filter(
      (item) =>
        (!input.unreadOnly || !item.readAt) &&
        (!input.type || item.type === input.type),
    );
  }

  async countUnread(): Promise<number> {
    return this.notifications.filter((item) => !item.readAt).length;
  }

  async markRead(input: {
    notificationId: string;
    readAt: Date;
  }): Promise<NotificationRecord | null> {
    const item = this.notifications.find((candidate) => candidate.id === input.notificationId);
    if (!item) return null;
    item.readAt = input.readAt;
    return item;
  }

  async markAllRead(input: { readAt: Date }): Promise<number> {
    let updated = 0;
    for (const item of this.notifications) {
      if (!item.readAt) {
        item.readAt = input.readAt;
        updated += 1;
      }
    }
    return updated;
  }

  async recordDeliveryAttempt(): Promise<DeliveryAttemptRecord> {
    throw new Error('not used');
  }

  async updateStatus(): Promise<NotificationRecord> {
    throw new Error('not used');
  }
}

describe('audience notification inbox use cases', () => {
  let repository: FakeNotificationRepository;

  beforeEach(() => {
    repository = new FakeNotificationRepository();
  });

  it('lists unread and typed notification filters', async () => {
    const useCase = new ListAudienceNotificationsUseCase(repository);

    await expect(useCase.execute({ userId: 'user-1', unreadOnly: true })).resolves.toHaveLength(1);
    await expect(useCase.execute({ userId: 'user-1', type: 'SUPPORT_UPDATE' })).resolves.toEqual([
      expect.objectContaining({ id: 'notification-2' }),
    ]);
  });

  it('counts unread notifications and marks read state', async () => {
    await expect(
      new GetAudienceUnreadNotificationCountUseCase(repository).execute('user-1'),
    ).resolves.toEqual({ unreadCount: 1 });

    const marked = await new MarkAudienceNotificationReadUseCase(repository).execute({
      userId: 'user-1',
      notificationId: 'notification-1',
    });

    expect(marked?.readAt).toBeInstanceOf(Date);
    await expect(
      new GetAudienceUnreadNotificationCountUseCase(repository).execute('user-1'),
    ).resolves.toEqual({ unreadCount: 0 });
  });

  it('marks all unread notifications as read', async () => {
    const result = await new MarkAllAudienceNotificationsReadUseCase(repository).execute('user-1');

    expect(result.updatedCount).toBe(1);
    expect(repository.notifications.every((item) => item.readAt)).toBe(true);
  });
});
