import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationChannelPort } from '../../domain/ports/notification-channel.port';
import type {
  NotificationRepositoryPort,
  RecordDeliveryAttemptInput,
  UpdateNotificationStatusInput,
} from '../../domain/ports/notification-repository.port';
import {
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationStatus,
  type DeliveryAttemptRecord,
  type NotificationRecord,
} from '../../domain/notification.types';
import { FailingEmailChannelAdapter } from '../../testing/failing-email-channel.adapter';
import type { PurchaseConfirmationEmailComposer } from '../services/purchase-confirmation-email-composer';
import { DeliverNotificationUseCase } from './deliver-notification.use-case';

function emailNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'notification-1',
    userId: 'user-1',
    concertId: 'concert-1',
    channel: NotificationChannel.EMAIL,
    type: 'PURCHASE_CONFIRMATION',
    dedupeKey: 'purchase-confirmation:order-1:email',
    status: NotificationStatus.PENDING,
    subject: 'TicketBox confirmation',
    body: 'Confirmed',
    scheduledAt: null,
    sentAt: null,
    failedAttemptCount: 0,
    ...overrides,
  };
}

class FakeNotificationRepository implements NotificationRepositoryPort {
  notification: NotificationRecord | null = emailNotification();
  attempts: DeliveryAttemptRecord[] = [];

  async upsertByDedupeKey(): Promise<NotificationRecord> {
    throw new Error('not used');
  }

  async findById(): Promise<NotificationRecord | null> {
    return this.notification;
  }

  async recordDeliveryAttempt(input: RecordDeliveryAttemptInput): Promise<DeliveryAttemptRecord> {
    const attempt: DeliveryAttemptRecord = {
      id: `attempt-${this.attempts.length + 1}`,
      notificationId: input.notificationId,
      status: input.status,
      provider: input.provider ?? null,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      attemptedAt: new Date('2026-06-15T12:00:00.000Z'),
    };
    this.attempts.push(attempt);
    return attempt;
  }

  async updateStatus(input: UpdateNotificationStatusInput): Promise<NotificationRecord> {
    if (!this.notification) throw new Error('notification missing');
    this.notification = {
      ...this.notification,
      status: input.status,
      sentAt: input.sentAt ?? this.notification.sentAt,
    };
    return this.notification;
  }
}

describe('DeliverNotificationUseCase', () => {
  let repository: FakeNotificationRepository;

  beforeEach(() => {
    repository = new FakeNotificationRepository();
  });

  it('records a successful email attempt and marks notification sent', async () => {
    const emailChannel: NotificationChannelPort = {
      send: vi.fn(async () => ({
        provider: 'local',
        providerMessageId: 'local:abc',
      })),
    };
    const useCase = new DeliverNotificationUseCase(repository, emailChannel, 3);

    const outcome = await useCase.execute('notification-1', 'audience@ticketbox.test');

    expect(outcome.shouldRetry).toBe(false);
    expect(outcome.status).toBe(NotificationStatus.SENT);
    expect(repository.attempts[0]).toMatchObject({
      status: NotificationAttemptStatus.SUCCEEDED,
      provider: 'local',
      providerMessageId: 'local:abc',
    });
    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'audience@ticketbox.test' }),
    );
  });

  it('records transient email failure and leaves notification retryable', async () => {
    const useCase = new DeliverNotificationUseCase(
      repository,
      new FailingEmailChannelAdapter('SMTP unavailable'),
      3,
    );

    const outcome = await useCase.execute('notification-1', 'audience@ticketbox.test');

    expect(outcome.shouldRetry).toBe(true);
    expect(outcome.status).toBe(NotificationStatus.PENDING);
    expect(repository.attempts[0]).toMatchObject({
      status: NotificationAttemptStatus.FAILED,
      errorMessage: 'SMTP unavailable',
    });
  });

  it('recreates purchase-confirmation attachments for each retry attempt', async () => {
    const compose = vi.fn(async () => ({
      body: 'Confirmed\nTCK-001 | VIP',
      attachments: [
        {
          filename: 'TCK-001.png',
          contentType: 'image/png',
          content: Buffer.from('png'),
        },
      ],
    }));
    const composer = { compose } as unknown as PurchaseConfirmationEmailComposer;
    const emailChannel: NotificationChannelPort = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error('SMTP unavailable'))
        .mockResolvedValueOnce({ provider: 'smtp', providerMessageId: 'message-1' }),
    };
    const useCase = new DeliverNotificationUseCase(repository, emailChannel, 3, composer);

    const first = await useCase.execute('notification-1', 'audience@ticketbox.test', {
      orderId: 'order-1',
    });
    const second = await useCase.execute('notification-1', 'audience@ticketbox.test', {
      orderId: 'order-1',
    });

    expect(first.shouldRetry).toBe(true);
    expect(second.status).toBe(NotificationStatus.SENT);
    expect(compose).toHaveBeenCalledTimes(2);
    expect(emailChannel.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: 'Confirmed\nTCK-001 | VIP',
        attachments: [
          expect.objectContaining({
            filename: 'TCK-001.png',
          }),
        ],
      }),
    );
  });

  it('does not compose QR attachments for non-purchase email', async () => {
    repository.notification = emailNotification({ type: 'CONCERT_REMINDER' });
    const compose = vi.fn();
    const emailChannel: NotificationChannelPort = {
      send: vi.fn(async () => ({ provider: 'local' })),
    };
    const useCase = new DeliverNotificationUseCase(repository, emailChannel, 3, {
      compose,
    } as unknown as PurchaseConfirmationEmailComposer);

    await useCase.execute('notification-1', 'audience@ticketbox.test', {
      orderId: 'order-1',
    });

    expect(compose).not.toHaveBeenCalled();
    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Confirmed', attachments: undefined }),
    );
  });

  it('marks notification failed when retry attempts are exhausted', async () => {
    repository.notification = emailNotification({ failedAttemptCount: 2 });
    const useCase = new DeliverNotificationUseCase(
      repository,
      new FailingEmailChannelAdapter('SMTP unavailable'),
      3,
    );

    const outcome = await useCase.execute('notification-1', 'audience@ticketbox.test');

    expect(outcome.shouldRetry).toBe(false);
    expect(outcome.status).toBe(NotificationStatus.FAILED);
  });

  it('marks in-app notification sent without calling the email adapter', async () => {
    repository.notification = emailNotification({
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
    });
    const emailChannel: NotificationChannelPort = { send: vi.fn() };
    const useCase = new DeliverNotificationUseCase(repository, emailChannel, 3);

    const outcome = await useCase.execute('notification-1');

    expect(outcome.status).toBe(NotificationStatus.SENT);
    expect(emailChannel.send).not.toHaveBeenCalled();
  });
});
