import { describe, expect, it, vi } from 'vitest';

import type { NotificationChannelPort } from './domain/ports/notification-channel.port';
import type {
  NotificationRepositoryPort,
  RecordDeliveryAttemptInput,
  UpdateNotificationStatusInput,
  UpsertNotificationInput,
} from './domain/ports/notification-repository.port';
import {
  NotificationAttemptStatus,
  NotificationStatus,
  type DeliveryAttemptRecord,
  type DeliveryRequest,
  type NotificationRecord,
} from './domain/notification.types';
import { EnqueuePurchaseConfirmationUseCase } from './application/use-cases/enqueue-purchase-confirmation.use-case';
import { CreatePurchaseConfirmationNotificationsUseCase } from './application/use-cases/create-purchase-confirmation-notifications.use-case';
import { DeliverNotificationUseCase } from './application/use-cases/deliver-notification.use-case';
import { PurchaseConfirmationEmailComposer } from './application/services/purchase-confirmation-email-composer';
import { QrcodePngRenderer } from './infrastructure/qr/qrcode-png-renderer';
import { QrTicketTokenService } from '../ordering/domain/qr-ticket-token.service';
import type { OrderDomainEvent } from '../ordering/domain/order-events';
import { OrderStatus } from '../ordering/domain/order-status.enum';
import { TicketIssuingOrderEventPublisher } from '../ordering/infrastructure/events/ticket-issuing-order-event-publisher';
import type { OrderPaidForNotification } from './domain/events/order-paid-for-notification.event';

class InMemoryNotificationRepository implements NotificationRepositoryPort {
  readonly notifications = new Map<string, NotificationRecord>();
  readonly attempts: DeliveryAttemptRecord[] = [];

  async upsertByDedupeKey(input: UpsertNotificationInput): Promise<NotificationRecord> {
    const existing = [...this.notifications.values()].find(
      (notification) => notification.dedupeKey === input.dedupeKey,
    );
    if (existing) return existing;

    const notification: NotificationRecord = {
      id: `notification-${this.notifications.size + 1}`,
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
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findById(notificationId: string): Promise<NotificationRecord | null> {
    return this.notifications.get(notificationId) ?? null;
  }

  async recordDeliveryAttempt(input: RecordDeliveryAttemptInput): Promise<DeliveryAttemptRecord> {
    const attempt: DeliveryAttemptRecord = {
      id: `attempt-${this.attempts.length + 1}`,
      notificationId: input.notificationId,
      status: input.status,
      provider: input.provider ?? null,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      attemptedAt: new Date('2026-06-24T02:00:00.000Z'),
    };
    this.attempts.push(attempt);
    return attempt;
  }

  async updateStatus(input: UpdateNotificationStatusInput): Promise<NotificationRecord> {
    const current = this.notifications.get(input.notificationId);
    if (!current) throw new Error('notification not found');
    const updated = {
      ...current,
      status: input.status,
      sentAt: input.sentAt ?? current.sentAt,
    };
    this.notifications.set(updated.id, updated);
    return updated;
  }
}

describe('purchase confirmation QR delivery integration', () => {
  it('delivers one QR per existing ticket without duplicating tickets or notifications', async () => {
    const issuedTickets: Array<{
      id: string;
      ticketNumber: string;
      orderId: string;
      userId: string;
      concertId: string;
      concertTitle: string;
      concertStartsAt: Date;
      ticketTypeName: string;
      issuedAt: Date;
    }> = [];
    const issueTickets = {
      execute: vi.fn(async ({ issuedAt }: { issuedAt: Date }) => {
        if (issuedTickets.length === 0) {
          issuedTickets.push(
            {
              id: 'ticket-1',
              ticketNumber: 'TCK-001',
              orderId: 'order-1',
              userId: 'user-1',
              concertId: 'concert-1',
              concertTitle: 'TicketBox Live',
              concertStartsAt: new Date('2026-07-01T12:00:00.000Z'),
              ticketTypeName: 'VIP',
              issuedAt,
            },
            {
              id: 'ticket-2',
              ticketNumber: 'TCK-002',
              orderId: 'order-1',
              userId: 'user-1',
              concertId: 'concert-1',
              concertTitle: 'TicketBox Live',
              concertStartsAt: new Date('2026-07-01T12:00:00.000Z'),
              ticketTypeName: 'VIP',
              issuedAt,
            },
          );
        }
      }),
    };
    const queuedEvents = new Map<string, OrderPaidForNotification>();
    const enqueueConfirmation = new EnqueuePurchaseConfirmationUseCase(
      {
        findOrderPaidNotificationData: vi.fn(async () =>
          issuedTickets.length
            ? {
                userId: 'user-1',
                userEmail: 'buyer@example.com',
                userDisplayName: 'Buyer',
                concertId: 'concert-1',
                concertTitle: 'TicketBox Live',
                startsAt: new Date('2026-07-01T12:00:00.000Z'),
                ticketCount: issuedTickets.length,
              }
            : null,
        ),
      },
      {
        enqueueOrderPaid: vi.fn(async (event) => {
          queuedEvents.set(event.eventId, event);
        }),
      },
      'http://localhost:5173',
    );
    const publisher = new TicketIssuingOrderEventPublisher(issueTickets as never, {
      notifyOrderPaid: (orderId: string, paidAt: Date) =>
        enqueueConfirmation.execute(orderId, paidAt),
    });
    const paidAt = new Date('2026-06-24T01:00:00.000Z');
    const event: OrderDomainEvent = {
      type: 'OrderPaid',
      orderId: 'order-1',
      previousStatus: OrderStatus.PENDING_PAYMENT,
      newStatus: OrderStatus.PAID,
      paidAt,
      occurredAt: paidAt,
    };

    await publisher.publishAll([event]);
    await publisher.publishAll([event]);

    expect(issuedTickets).toHaveLength(2);
    expect(queuedEvents).toHaveLength(1);

    const repository = new InMemoryNotificationRepository();
    const createNotifications = new CreatePurchaseConfirmationNotificationsUseCase(repository);
    const queuedEvent = [...queuedEvents.values()][0];
    const notifications = await createNotifications.execute(queuedEvent);
    await createNotifications.execute(queuedEvent);

    expect(repository.notifications).toHaveLength(2);

    const sentRequests: DeliveryRequest[] = [];
    const emailChannel: NotificationChannelPort = {
      send: vi.fn(async (request) => {
        sentRequests.push(request);
        return { provider: 'smtp', providerMessageId: 'message-1' };
      }),
    };
    const composer = new PurchaseConfirmationEmailComposer(
      {
        findIssuedTicketsByPaidOrderId: vi.fn(async () => issuedTickets),
      },
      new QrTicketTokenService('integration-secret'),
      new QrcodePngRenderer(),
    );
    const deliver = new DeliverNotificationUseCase(repository, emailChannel, 3, composer);

    const outcome = await deliver.execute(notifications.email.id, 'buyer@example.com', {
      orderId: 'order-1',
    });

    expect(outcome.status).toBe(NotificationStatus.SENT);
    expect(sentRequests[0].attachments).toHaveLength(2);
    expect(sentRequests[0].attachments?.every((item) => item.contentType === 'image/png')).toBe(
      true,
    );
    expect(repository.attempts[0].status).toBe(NotificationAttemptStatus.SUCCEEDED);

    const durableData = JSON.stringify({
      queuedEvents: [...queuedEvents.values()],
      notifications: [...repository.notifications.values()],
    });
    expect(durableData).not.toContain('integration-secret');
    expect(durableData).not.toContain('iVBOR');
    expect(durableData).not.toContain('ticketbox.ticket');
  });
});
