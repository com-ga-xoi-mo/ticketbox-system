import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationStatus,
} from '../../domain/notification.types';
import { PrismaNotificationRepository } from './prisma-notification.repository';

function notificationRow(overrides = {}) {
  return {
    id: 'notification-1',
    userId: 'user-1',
    concertId: 'concert-1',
    channel: 'EMAIL',
    type: 'PURCHASE_CONFIRMATION',
    dedupeKey: 'purchase-confirmation:order-1:email',
    status: 'PENDING',
    subject: 'TicketBox confirmation',
    body: 'Confirmed',
    scheduledAt: null,
    sentAt: null,
    attempts: [],
    ...overrides,
  };
}

describe('PrismaNotificationRepository', () => {
  let prisma: {
    notification: {
      upsert: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    notificationAttempt: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaNotificationRepository;

  beforeEach(() => {
    prisma = {
      notification: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      notificationAttempt: {
        create: vi.fn(),
      },
    };
    repository = new PrismaNotificationRepository(prisma as never);
  });

  it('upserts notifications by dedupe key', async () => {
    prisma.notification.upsert.mockResolvedValue(notificationRow());

    const result = await repository.upsertByDedupeKey({
      userId: 'user-1',
      concertId: 'concert-1',
      channel: NotificationChannel.EMAIL,
      type: 'PURCHASE_CONFIRMATION',
      dedupeKey: 'purchase-confirmation:order-1:email',
      status: NotificationStatus.PENDING,
      subject: 'TicketBox confirmation',
      body: 'Confirmed',
    });

    expect(result.dedupeKey).toBe('purchase-confirmation:order-1:email');
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: 'purchase-confirmation:order-1:email' },
        create: expect.objectContaining({
          dedupeKey: 'purchase-confirmation:order-1:email',
        }),
      }),
    );
  });

  it('counts failed attempts when mapping notification records', async () => {
    prisma.notification.findUnique.mockResolvedValue(
      notificationRow({
        attempts: [{ status: 'FAILED' }, { status: 'SUCCEEDED' }, { status: 'FAILED' }],
      }),
    );

    const result = await repository.findById('notification-1');

    expect(result?.failedAttemptCount).toBe(2);
  });

  it('persists delivery attempts', async () => {
    prisma.notificationAttempt.create.mockResolvedValue({
      id: 'attempt-1',
      notificationId: 'notification-1',
      status: 'FAILED',
      provider: 'local',
      providerMessageId: null,
      errorMessage: 'SMTP unavailable',
      attemptedAt: new Date('2026-06-15T12:00:00.000Z'),
    });

    const result = await repository.recordDeliveryAttempt({
      notificationId: 'notification-1',
      status: NotificationAttemptStatus.FAILED,
      provider: 'local',
      errorMessage: 'SMTP unavailable',
    });

    expect(result.status).toBe(NotificationAttemptStatus.FAILED);
    expect(prisma.notificationAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notificationId: 'notification-1',
        status: NotificationAttemptStatus.FAILED,
      }),
    });
  });
});
