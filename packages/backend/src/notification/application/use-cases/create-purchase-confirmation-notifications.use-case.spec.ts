import { beforeEach, describe, expect, it } from 'vitest';

import type { OrderPaidForNotification } from '../../domain/events/order-paid-for-notification.event';
import type {
  NotificationRepositoryPort,
  UpsertNotificationInput,
} from '../../domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  type NotificationRecord,
} from '../../domain/notification.types';
import { CreatePurchaseConfirmationNotificationsUseCase } from './create-purchase-confirmation-notifications.use-case';

function eventFixture(): OrderPaidForNotification {
  return {
    eventId: 'evt-1',
    orderId: 'order-1',
    userId: 'user-1',
    userEmail: 'audience@ticketbox.test',
    userDisplayName: 'Audience',
    concertId: 'concert-1',
    concertTitle: 'Anh Trai Say Hi',
    startsAt: '2026-07-01T20:00:00.000Z',
    ticketCount: 2,
    ticketAccessUrl: 'https://ticketbox.test/me/tickets/order-1',
    paidAt: '2026-06-15T12:00:00.000Z',
  };
}

class InMemoryNotificationRepository implements NotificationRepositoryPort {
  readonly records = new Map<string, NotificationRecord>();

  async upsertByDedupeKey(input: UpsertNotificationInput): Promise<NotificationRecord> {
    const existing = this.records.get(input.dedupeKey);
    if (existing) return existing;

    const record: NotificationRecord = {
      id: `notification-${this.records.size + 1}`,
      userId: input.userId,
      concertId: input.concertId ?? null,
      channel: input.channel,
      type: input.type,
      dedupeKey: input.dedupeKey,
      status: input.status,
      subject: input.subject ?? null,
      body: input.body,
      scheduledAt: input.scheduledAt ?? null,
      sentAt: input.sentAt ?? null,
      failedAttemptCount: 0,
    };
    this.records.set(input.dedupeKey, record);
    return record;
  }

  async findById(): Promise<NotificationRecord | null> {
    return null;
  }

  async recordDeliveryAttempt(): Promise<never> {
    throw new Error('not used');
  }

  async updateStatus(): Promise<never> {
    throw new Error('not used');
  }
}

describe('CreatePurchaseConfirmationNotificationsUseCase', () => {
  let repository: InMemoryNotificationRepository;
  let useCase: CreatePurchaseConfirmationNotificationsUseCase;

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    useCase = new CreatePurchaseConfirmationNotificationsUseCase(repository);
  });

  it('creates in-app and email notification records from a paid order event', async () => {
    const result = await useCase.execute(eventFixture());

    expect(result.inApp.channel).toBe(NotificationChannel.IN_APP);
    expect(result.inApp.status).toBe(NotificationStatus.SENT);
    expect(result.inApp.dedupeKey).toBe('purchase-confirmation:order-1:in-app');
    expect(result.email.channel).toBe(NotificationChannel.EMAIL);
    expect(result.email.status).toBe(NotificationStatus.PENDING);
    expect(result.email.dedupeKey).toBe('purchase-confirmation:order-1:email');
    expect(result.email.body).toContain('View your e-tickets');
    expect(result.email.body).toContain('https://ticketbox.test/me/tickets/order-1');
    expect(result.inApp.body).toContain('https://ticketbox.test/me/tickets/order-1');
    expect(JSON.stringify([...repository.records.values()])).not.toContain('qrPayload');
    expect(JSON.stringify([...repository.records.values()])).not.toContain('image/png');
    expect(repository.records.size).toBe(2);
  });

  it('reuses existing notification records for duplicate paid-order events', async () => {
    const first = await useCase.execute(eventFixture());
    const second = await useCase.execute(eventFixture());

    expect(second.inApp.id).toBe(first.inApp.id);
    expect(second.email.id).toBe(first.email.id);
    expect(repository.records.size).toBe(2);
  });
});
