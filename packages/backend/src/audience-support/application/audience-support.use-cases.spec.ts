import { beforeEach, describe, expect, it } from 'vitest';

import type { NotificationRepositoryPort } from '../../notification/domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationStatus,
  type NotificationRecord,
} from '../../notification/domain/notification.types';
import { OrderStatus } from '../../ordering/domain/order-status.enum';
import { QrTicketTokenService } from '../../ordering/domain/qr-ticket-token.service';
import { TicketStatus } from '../../ordering/domain/ticket-status.enum';
import {
  AudienceResourceNotFoundError,
  DuplicateRefundRequestError,
  RefundRequestIneligibleError,
  TicketResendUnavailableError,
} from '../domain/errors';
import type {
  AudienceSupportRepositoryPort,
  CreateRefundRequestInput,
  CreateSupportRequestInput,
} from '../domain/ports/audience-support-repository.port';
import {
  RefundRequestReason,
  RefundRequestStatus,
  SupportRequestCategory,
  SupportRequestStatus,
  type OwnedOrderResource,
  type OwnedTicketResource,
  type RefundRequestRecord,
  type SupportRequestRecord,
} from '../domain/support.types';
import {
  CreateRefundRequestUseCase,
  CreateSupportRequestUseCase,
  GetOrderConfirmationUseCase,
  GetRefundEligibilityUseCase,
  GetTicketDownloadUseCase,
  ResendTicketsUseCase,
} from './audience-support.use-cases';

const now = new Date('2026-06-25T05:00:00.000Z');

function supportRequest(overrides: Partial<SupportRequestRecord> = {}): SupportRequestRecord {
  return {
    id: 'support-1',
    userId: 'user-1',
    orderId: 'order-1',
    ticketId: null,
    category: SupportRequestCategory.ORDER_HELP,
    status: SupportRequestStatus.OPEN,
    subject: 'Need help',
    message: 'Please help with this order.',
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      { id: 'history-1', status: SupportRequestStatus.OPEN, note: null, createdAt: now },
    ],
    ...overrides,
  };
}

function refundRequest(overrides: Partial<RefundRequestRecord> = {}): RefundRequestRecord {
  return {
    id: 'refund-1',
    userId: 'user-1',
    orderId: 'order-1',
    ticketId: null,
    status: RefundRequestStatus.REQUESTED,
    reason: RefundRequestReason.CANNOT_ATTEND,
    message: 'I cannot attend anymore.',
    requestedAmountVnd: 450000,
    requestedTicketCount: 1,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      { id: 'history-1', status: RefundRequestStatus.REQUESTED, note: null, createdAt: now },
    ],
    ...overrides,
  };
}

function ownedOrder(overrides: Partial<OwnedOrderResource> = {}): OwnedOrderResource {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    userId: 'user-1',
    concertId: 'concert-1',
    status: OrderStatus.PAID,
    totalAmountVnd: 450000,
    paidAt: now,
    createdAt: now,
    items: [
      {
        ticketTypeId: 'type-1',
        ticketTypeName: 'GA',
        quantity: 1,
        unitPriceVnd: 450000,
        totalPriceVnd: 450000,
      },
    ],
    tickets: [{ id: 'ticket-1', status: TicketStatus.ISSUED }],
    concert: {
      id: 'concert-1',
      title: 'TicketBox Live',
      venueName: 'TicketBox Arena',
      startsAt: now,
    },
    payment: { provider: 'VNPAY', completedAt: now },
    ...overrides,
  };
}

function ownedTicket(overrides: Partial<OwnedTicketResource> = {}): OwnedTicketResource {
  return {
    id: 'ticket-1',
    ticketNumber: 'TCK-1',
    orderId: 'order-1',
    orderNumber: 'ORD-1',
    userId: 'user-1',
    concertId: 'concert-1',
    status: TicketStatus.ISSUED,
    issuedAt: now,
    checkedInAt: null,
    ticketTypeId: 'type-1',
    ticketTypeName: 'GA',
    ticketTypeCode: 'GA',
    qrTokenHash: 'hash',
    order: {
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: OrderStatus.PAID,
      totalAmountVnd: 450000,
      paidAt: now,
      createdAt: now,
    },
    concert: {
      id: 'concert-1',
      title: 'TicketBox Live',
      venueName: 'TicketBox Arena',
      startsAt: now,
    },
    ...overrides,
  };
}

class FakeSupportRepository implements AudienceSupportRepositoryPort {
  order: OwnedOrderResource | null = ownedOrder();
  ticket: OwnedTicketResource | null = ownedTicket();
  activeRefund: RefundRequestRecord | null = null;
  createdSupportInputs: CreateSupportRequestInput[] = [];
  createdRefundInputs: CreateRefundRequestInput[] = [];

  async findOwnedOrder(): Promise<OwnedOrderResource | null> {
    return this.order;
  }

  async findOwnedTicket(): Promise<OwnedTicketResource | null> {
    return this.ticket;
  }

  async createSupportRequest(input: CreateSupportRequestInput): Promise<SupportRequestRecord> {
    this.createdSupportInputs.push(input);
    return supportRequest({ orderId: input.orderId ?? null, ticketId: input.ticketId ?? null });
  }

  async listSupportRequests(): Promise<SupportRequestRecord[]> {
    return [supportRequest()];
  }

  async findSupportRequest(): Promise<SupportRequestRecord | null> {
    return supportRequest();
  }

  async createRefundRequest(input: CreateRefundRequestInput): Promise<RefundRequestRecord> {
    this.createdRefundInputs.push(input);
    return refundRequest({
      orderId: input.orderId,
      ticketId: input.ticketId ?? null,
      reason: input.reason,
      message: input.message ?? null,
      requestedAmountVnd: input.requestedAmountVnd ?? null,
      requestedTicketCount: input.requestedTicketCount ?? null,
    });
  }

  async listRefundRequests(): Promise<RefundRequestRecord[]> {
    return [refundRequest()];
  }

  async findRefundRequest(): Promise<RefundRequestRecord | null> {
    return refundRequest();
  }

  async findActiveRefundRequest(): Promise<RefundRequestRecord | null> {
    return this.activeRefund;
  }
}

class FakeNotificationRepository implements NotificationRepositoryPort {
  notifications: NotificationRecord[] = [];

  async upsertByDedupeKey(input: Parameters<NotificationRepositoryPort['upsertByDedupeKey']>[0]) {
    const existing = this.notifications.find((item) => item.dedupeKey === input.dedupeKey);
    if (existing) return existing;
    const notification: NotificationRecord = {
      id: `notification-${this.notifications.length + 1}`,
      userId: input.userId,
      concertId: input.concertId ?? null,
      channel: input.channel,
      type: input.type,
      dedupeKey: input.dedupeKey,
      status: input.status,
      subject: input.subject ?? null,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      readAt: input.readAt ?? null,
      scheduledAt: input.scheduledAt ?? null,
      sentAt: input.sentAt ?? null,
      createdAt: now,
      updatedAt: now,
      failedAttemptCount: 0,
    };
    this.notifications.push(notification);
    return notification;
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

describe('audience support use cases', () => {
  let repository: FakeSupportRepository;
  let notifications: FakeNotificationRepository;

  beforeEach(() => {
    repository = new FakeSupportRepository();
    notifications = new FakeNotificationRepository();
  });

  it('creates a support request for an owned ticket and links its order', async () => {
    const useCase = new CreateSupportRequestUseCase(repository, notifications);

    const request = await useCase.execute({
      userId: 'user-1',
      ticketId: 'ticket-1',
      category: SupportRequestCategory.TICKET_HELP,
      subject: 'Need ticket help',
      message: 'Please resend my ticket.',
    });

    expect(request.ticketId).toBe('ticket-1');
    expect(repository.createdSupportInputs[0]).toMatchObject({
      orderId: 'order-1',
      ticketId: 'ticket-1',
    });
    expect(notifications.notifications[0]).toMatchObject({
      channel: NotificationChannel.IN_APP,
      type: 'SUPPORT_UPDATE',
      status: NotificationStatus.SENT,
    });
  });

  it('returns not found semantics when a linked resource is not owned', async () => {
    repository.order = null;
    const useCase = new CreateSupportRequestUseCase(repository, notifications);

    await expect(
      useCase.execute({
        userId: 'user-1',
        orderId: 'other-order',
        category: SupportRequestCategory.ORDER_HELP,
        subject: 'Need order help',
        message: 'Please help with this order.',
      }),
    ).rejects.toThrow(AudienceResourceNotFoundError);
  });

  it('computes paid-order refund eligibility and duplicate active request state', async () => {
    const useCase = new GetRefundEligibilityUseCase(repository);

    await expect(useCase.execute({ userId: 'user-1', orderId: 'order-1' })).resolves.toMatchObject({
      eligible: true,
      orderId: 'order-1',
      refundableAmountVnd: 450000,
    });

    repository.activeRefund = refundRequest({ id: 'refund-active' });

    await expect(useCase.execute({ userId: 'user-1', orderId: 'order-1' })).resolves.toMatchObject({
      eligible: false,
      reasonCode: 'DUPLICATE_ACTIVE_REQUEST',
      existingRequestId: 'refund-active',
    });
  });

  it('rejects refund request for unpaid order and duplicate active request', async () => {
    repository.order = ownedOrder({ status: OrderStatus.PENDING_PAYMENT });
    const eligibility = new GetRefundEligibilityUseCase(repository);
    const create = new CreateRefundRequestUseCase(repository, eligibility, notifications);

    await expect(
      create.execute({
        userId: 'user-1',
        orderId: 'order-1',
        reason: RefundRequestReason.CANNOT_ATTEND,
        message: 'I cannot attend anymore.',
      }),
    ).rejects.toThrow(RefundRequestIneligibleError);

    repository.order = ownedOrder();
    repository.activeRefund = refundRequest({ id: 'refund-active' });

    await expect(
      create.execute({
        userId: 'user-1',
        orderId: 'order-1',
        reason: RefundRequestReason.CANNOT_ATTEND,
        message: 'I cannot attend anymore.',
      }),
    ).rejects.toThrow(DuplicateRefundRequestError);
  });

  it('creates a refund request without mutating payment settlement state', async () => {
    const eligibility = new GetRefundEligibilityUseCase(repository);
    const create = new CreateRefundRequestUseCase(repository, eligibility, notifications);

    const request = await create.execute({
      userId: 'user-1',
      orderId: 'order-1',
      reason: RefundRequestReason.CANNOT_ATTEND,
      message: 'I cannot attend anymore.',
    });

    expect(request.status).toBe(RefundRequestStatus.REQUESTED);
    expect(repository.createdRefundInputs[0]).toMatchObject({
      orderId: 'order-1',
      requestedAmountVnd: 450000,
    });
    expect(notifications.notifications[0]).toMatchObject({ type: 'REFUND_UPDATE' });
  });

  it('creates resend notification for paid orders and rejects unavailable resend', async () => {
    const useCase = new ResendTicketsUseCase(repository, notifications);

    await expect(useCase.resendOrder('user-1', 'order-1')).resolves.toMatchObject({
      notificationId: 'notification-1',
    });
    await expect(useCase.resendOrder('user-1', 'order-1')).resolves.toMatchObject({
      notificationId: 'notification-1',
    });
    expect(notifications.notifications).toHaveLength(1);
    expect(notifications.notifications[0]).toMatchObject({
      channel: NotificationChannel.EMAIL,
      type: 'TICKET_RESEND',
    });

    repository.order = ownedOrder({ status: OrderStatus.PENDING_PAYMENT });
    await expect(useCase.resendOrder('user-1', 'order-1')).rejects.toThrow(
      TicketResendUnavailableError,
    );
  });

  it('returns ticket download data with transient QR payload', async () => {
    const useCase = new GetTicketDownloadUseCase(
      repository,
      new QrTicketTokenService('test-secret'),
    );

    const result = await useCase.execute('user-1', 'ticket-1');

    expect(result.ticket.id).toBe('ticket-1');
    expect(result.qrPayload).toContain('.');
  });

  it('returns paid order confirmation data and hides pending order confirmation', async () => {
    const useCase = new GetOrderConfirmationUseCase(repository);

    await expect(useCase.execute('user-1', 'order-1')).resolves.toMatchObject({
      order: expect.objectContaining({ id: 'order-1' }),
    });

    repository.order = ownedOrder({ status: OrderStatus.PENDING_PAYMENT });
    await expect(useCase.execute('user-1', 'order-1')).rejects.toThrow(
      AudienceResourceNotFoundError,
    );
  });
});
