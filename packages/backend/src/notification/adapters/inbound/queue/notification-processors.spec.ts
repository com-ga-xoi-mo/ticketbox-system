import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, Queue } from 'bullmq';

import type { CreatePurchaseConfirmationNotificationsUseCase } from '../../../application/use-cases/create-purchase-confirmation-notifications.use-case';
import type { DeliverNotificationUseCase } from '../../../application/use-cases/deliver-notification.use-case';
import { NotificationChannel, NotificationStatus } from '../../../domain/notification.types';
import type { OrderPaidForNotification } from '../../../domain/events/order-paid-for-notification.event';
import type { PlatformConfigService } from '../../../../platform/config/platform-config.service';
import { NotificationDeliveryProcessor } from './notification-delivery.processor';
import { PurchaseConfirmationProcessor } from './purchase-confirmation.processor';
import type {
  NotificationDeliveryJobData,
  PurchaseConfirmationJobData,
} from '../../../infrastructure/queue/notification-job.types';

function orderPaidEvent(): OrderPaidForNotification {
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

describe('notification BullMQ processors', () => {
  let config: Pick<PlatformConfigService, 'emailMaxAttempts' | 'emailRetryBackoffMs'>;

  beforeEach(() => {
    config = {
      emailMaxAttempts: 3,
      emailRetryBackoffMs: 5000,
    };
  });

  it('purchase confirmation processor creates notifications and enqueues email delivery', async () => {
    const createPurchaseConfirmation = {
      execute: vi.fn(async () => ({
        inApp: {
          id: 'notification-in-app',
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
        },
        email: {
          id: 'notification-email',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        },
      })),
    } as unknown as CreatePurchaseConfirmationNotificationsUseCase;
    const deliveryQueue = {
      add: vi.fn(async () => undefined),
    } as unknown as Queue<NotificationDeliveryJobData>;
    const processor = new PurchaseConfirmationProcessor(
      createPurchaseConfirmation,
      config as PlatformConfigService,
      deliveryQueue,
    );

    const result = await processor.process({
      data: orderPaidEvent(),
    } as Job<PurchaseConfirmationJobData>);

    expect(result).toEqual({ emailNotificationId: 'notification-email' });
    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'notification.deliver',
      {
        notificationId: 'notification-email',
        toEmail: 'audience@ticketbox.test',
      },
      expect.objectContaining({
        jobId: 'deliver-notification-email',
        attempts: 3,
      }),
    );
  });

  it('delivery processor returns status for successful non-retryable delivery', async () => {
    const deliverNotification = {
      execute: vi.fn(async () => ({
        notificationId: 'notification-email',
        status: NotificationStatus.SENT,
        shouldRetry: false,
      })),
    } as unknown as DeliverNotificationUseCase;
    const processor = new NotificationDeliveryProcessor(deliverNotification);

    const result = await processor.process({
      data: {
        notificationId: 'notification-email',
        toEmail: 'audience@ticketbox.test',
      },
    } as Job<NotificationDeliveryJobData>);

    expect(result).toEqual({ status: NotificationStatus.SENT });
  });

  it('delivery processor throws when use case reports retryable failure', async () => {
    const deliverNotification = {
      execute: vi.fn(async () => ({
        notificationId: 'notification-email',
        status: NotificationStatus.PENDING,
        shouldRetry: true,
      })),
    } as unknown as DeliverNotificationUseCase;
    const processor = new NotificationDeliveryProcessor(deliverNotification);

    await expect(
      processor.process({
        data: {
          notificationId: 'notification-email',
          toEmail: 'audience@ticketbox.test',
        },
      } as Job<NotificationDeliveryJobData>),
    ).rejects.toThrow('Email delivery failed and should be retried');
  });
});
