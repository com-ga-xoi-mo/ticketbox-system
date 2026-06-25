import { OrderStatus } from '../../ordering/domain/order-status.enum';
import { TicketStatus } from '../../ordering/domain/ticket-status.enum';
import type { QrTicketTokenService } from '../../ordering/domain/qr-ticket-token.service';
import type { NotificationRepositoryPort } from '../../notification/domain/ports/notification-repository.port';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
} from '../../notification/domain/notification.types';
import type {
  AudienceSupportRepositoryPort,
  CreateSupportRequestInput,
} from '../domain/ports/audience-support-repository.port';
import {
  AudienceResourceNotFoundError,
  DuplicateRefundRequestError,
  RefundRequestIneligibleError,
  TicketResendUnavailableError,
} from '../domain/errors';
import type {
  RefundRequestReason,
  RefundRequestRecord,
  SupportRequestRecord} from '../domain/support.types';
import {
  RefundRequestStatus,
  SupportRequestStatus,
  type RefundEligibility,
} from '../domain/support.types';

export class CreateSupportRequestUseCase {
  constructor(
    private readonly repository: AudienceSupportRepositoryPort,
    private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async execute(input: CreateSupportRequestInput): Promise<SupportRequestRecord> {
    if (input.orderId) {
      const order = await this.repository.findOwnedOrder(input.userId, input.orderId);
      if (!order) throw new AudienceResourceNotFoundError('Order');
    }

    if (input.ticketId) {
      const ticket = await this.repository.findOwnedTicket(input.userId, input.ticketId);
      if (!ticket) throw new AudienceResourceNotFoundError('Ticket');
      input = { ...input, orderId: ticket.orderId };
    }

    const request = await this.repository.createSupportRequest(input);
    await this.createInAppNotificationSafe({
      userId: input.userId,
      type: 'SUPPORT_UPDATE',
      dedupeKey: `support-request-created:${request.id}`,
      subject: 'Support request received',
      body: `We received your support request: ${request.subject}`,
      actionUrl: `/account/support/requests/${request.id}`,
      resourceType: NotificationResourceType.SUPPORT_REQUEST,
      resourceId: request.id,
    });
    return request;
  }

  private async createInAppNotificationSafe(input: {
    userId: string;
    type: string;
    dedupeKey: string;
    subject: string;
    body: string;
    actionUrl: string;
    resourceType: NotificationResourceType;
    resourceId: string;
  }): Promise<void> {
    try {
      await this.notificationRepository.upsertByDedupeKey({
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        type: input.type,
        dedupeKey: input.dedupeKey,
        status: NotificationStatus.SENT,
        subject: input.subject,
        body: input.body,
        actionUrl: input.actionUrl,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        sentAt: new Date(),
      });
    } catch {
      // Support state is the source of truth; notification retry can be handled separately.
    }
  }
}

export class ListSupportRequestsUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  execute(userId: string): Promise<SupportRequestRecord[]> {
    return this.repository.listSupportRequests(userId);
  }
}

export class GetSupportRequestUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  async execute(userId: string, requestId: string): Promise<SupportRequestRecord> {
    const request = await this.repository.findSupportRequest(userId, requestId);
    if (!request) throw new AudienceResourceNotFoundError('Support request');
    return request;
  }
}

export class GetRefundEligibilityUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  async execute(input: {
    userId: string;
    orderId?: string | null;
    ticketId?: string | null;
  }): Promise<RefundEligibility> {
    const resource = await this.resolveRefundResource(input);
    if (!resource) {
      return this.ineligible('NOT_FOUND', 'Resource not found.', null, null);
    }

    const existing = await this.repository.findActiveRefundRequest({
      userId: input.userId,
      orderId: resource.orderId,
      ticketId: resource.ticketId,
    });
    if (existing) {
      return {
        eligible: false,
        reasonCode: 'DUPLICATE_ACTIVE_REQUEST',
        message: 'A refund request is already active for this resource.',
        orderId: resource.orderId,
        ticketId: resource.ticketId,
        refundableAmountVnd: resource.amountVnd,
        refundableTicketCount: resource.ticketCount,
        existingRequestId: existing.id,
      };
    }

    if (resource.orderStatus !== OrderStatus.PAID) {
      return this.ineligible(
        resource.orderStatus === OrderStatus.REFUNDED ? 'ORDER_FINALIZED' : 'ORDER_NOT_PAID',
        'Only paid orders can request a refund.',
        resource.orderId,
        resource.ticketId,
      );
    }

    if (resource.ticketStatus && resource.ticketStatus !== TicketStatus.ISSUED) {
      return this.ineligible(
        'TICKET_NOT_REFUNDABLE',
        'Only issued tickets can request a refund.',
        resource.orderId,
        resource.ticketId,
      );
    }

    return {
      eligible: true,
      reasonCode: 'ELIGIBLE',
      message: 'Eligible for refund request.',
      orderId: resource.orderId,
      ticketId: resource.ticketId,
      refundableAmountVnd: resource.amountVnd,
      refundableTicketCount: resource.ticketCount,
      existingRequestId: null,
    };
  }

  private async resolveRefundResource(input: {
    userId: string;
    orderId?: string | null;
    ticketId?: string | null;
  }): Promise<{
    orderId: string;
    ticketId: string | null;
    orderStatus: OrderStatus;
    ticketStatus: TicketStatus | null;
    amountVnd: number;
    ticketCount: number;
  } | null> {
    if (input.ticketId) {
      const ticket = await this.repository.findOwnedTicket(input.userId, input.ticketId);
      if (!ticket) return null;
      return {
        orderId: ticket.orderId,
        ticketId: ticket.id,
        orderStatus: ticket.order.status,
        ticketStatus: ticket.status,
        amountVnd: ticket.order.totalAmountVnd,
        ticketCount: 1,
      };
    }

    if (!input.orderId) return null;
    const order = await this.repository.findOwnedOrder(input.userId, input.orderId);
    if (!order) return null;
    return {
      orderId: order.id,
      ticketId: null,
      orderStatus: order.status,
      ticketStatus: null,
      amountVnd: order.totalAmountVnd,
      ticketCount: order.tickets.length,
    };
  }

  private ineligible(
    reasonCode: RefundEligibility['reasonCode'],
    message: string,
    orderId: string | null,
    ticketId: string | null,
  ): RefundEligibility {
    return {
      eligible: false,
      reasonCode,
      message,
      orderId,
      ticketId,
      refundableAmountVnd: null,
      refundableTicketCount: null,
      existingRequestId: null,
    };
  }
}

export class CreateRefundRequestUseCase {
  constructor(
    private readonly repository: AudienceSupportRepositoryPort,
    private readonly eligibility: GetRefundEligibilityUseCase,
    private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async execute(input: {
    userId: string;
    orderId?: string | null;
    ticketId?: string | null;
    reason: RefundRequestReason;
    message?: string | null;
  }): Promise<RefundRequestRecord> {
    const eligibility = await this.eligibility.execute(input);
    if (!eligibility.eligible || !eligibility.orderId) {
      if (eligibility.existingRequestId) {
        throw new DuplicateRefundRequestError(eligibility.existingRequestId);
      }
      throw new RefundRequestIneligibleError(eligibility.message);
    }

    const request = await this.repository.createRefundRequest({
      userId: input.userId,
      orderId: eligibility.orderId,
      ticketId: eligibility.ticketId,
      reason: input.reason,
      message: input.message ?? null,
      requestedAmountVnd: eligibility.refundableAmountVnd,
      requestedTicketCount: eligibility.refundableTicketCount,
    });

    await this.createRefundNotificationSafe(request);
    return request;
  }

  private async createRefundNotificationSafe(request: RefundRequestRecord): Promise<void> {
    try {
      await this.notificationRepository.upsertByDedupeKey({
        userId: request.userId,
        channel: NotificationChannel.IN_APP,
        type: 'REFUND_UPDATE',
        dedupeKey: `refund-request-created:${request.id}`,
        status: NotificationStatus.SENT,
        subject: 'Refund request received',
        body: 'We received your refund request and it is waiting for review.',
        actionUrl: `/account/support/refunds/${request.id}`,
        resourceType: NotificationResourceType.REFUND_REQUEST,
        resourceId: request.id,
        sentAt: new Date(),
      });
    } catch {
      // Refund request creation must not roll back on notification failure.
    }
  }
}

export class ListRefundRequestsUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  execute(userId: string): Promise<RefundRequestRecord[]> {
    return this.repository.listRefundRequests(userId);
  }
}

export class GetRefundRequestUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  async execute(userId: string, requestId: string): Promise<RefundRequestRecord> {
    const request = await this.repository.findRefundRequest(userId, requestId);
    if (!request) throw new AudienceResourceNotFoundError('Refund request');
    return request;
  }
}

export class ResendTicketsUseCase {
  constructor(
    private readonly repository: AudienceSupportRepositoryPort,
    private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async resendOrder(userId: string, orderId: string): Promise<{ notificationId: string }> {
    const order = await this.repository.findOwnedOrder(userId, orderId);
    if (!order) throw new AudienceResourceNotFoundError('Order');
    if (order.status !== OrderStatus.PAID || order.tickets.length === 0) {
      throw new TicketResendUnavailableError('Tickets can only be resent for paid orders.');
    }

    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId,
      concertId: order.concertId,
      channel: NotificationChannel.EMAIL,
      type: 'TICKET_RESEND',
      dedupeKey: this.dedupeKey('order', orderId),
      status: NotificationStatus.PENDING,
      subject: `Ticket resend: ${order.concert.title}`,
      body: `Ticket resend requested for order ${order.orderNumber}.`,
      actionUrl: `/account/orders/${order.id}`,
      resourceType: NotificationResourceType.ORDER,
      resourceId: order.id,
    });
    return { notificationId: notification.id };
  }

  async resendTicket(userId: string, ticketId: string): Promise<{ notificationId: string }> {
    const ticket = await this.repository.findOwnedTicket(userId, ticketId);
    if (!ticket) throw new AudienceResourceNotFoundError('Ticket');
    if (ticket.order.status !== OrderStatus.PAID || ticket.status !== TicketStatus.ISSUED) {
      throw new TicketResendUnavailableError('Only issued tickets on paid orders can be resent.');
    }

    const notification = await this.notificationRepository.upsertByDedupeKey({
      userId,
      concertId: ticket.concertId,
      channel: NotificationChannel.EMAIL,
      type: 'TICKET_RESEND',
      dedupeKey: this.dedupeKey('ticket', ticketId),
      status: NotificationStatus.PENDING,
      subject: `Ticket resend: ${ticket.concert.title}`,
      body: `Ticket resend requested for ticket ${ticket.ticketNumber}.`,
      actionUrl: `/account/tickets/${ticket.id}`,
      resourceType: NotificationResourceType.TICKET,
      resourceId: ticket.id,
    });
    return { notificationId: notification.id };
  }

  private dedupeKey(scope: 'order' | 'ticket', id: string): string {
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    return `ticket-resend:${scope}:${id}:${bucket}`;
  }
}

export class GetTicketDownloadUseCase {
  constructor(
    private readonly repository: AudienceSupportRepositoryPort,
    private readonly qrTicketTokenService: QrTicketTokenService,
  ) {}

  async execute(userId: string, ticketId: string) {
    const ticket = await this.repository.findOwnedTicket(userId, ticketId);
    if (!ticket) throw new AudienceResourceNotFoundError('Ticket');

    const qrPayload =
      ticket.status === TicketStatus.ISSUED
        ? this.qrTicketTokenService.createPayload({
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            orderId: ticket.orderId,
            concertId: ticket.concertId,
            userId: ticket.userId,
            issuedAt: ticket.issuedAt,
          })
        : null;

    return { ticket, qrPayload, generatedAt: new Date() };
  }
}

export class GetOrderConfirmationUseCase {
  constructor(private readonly repository: AudienceSupportRepositoryPort) {}

  async execute(userId: string, orderId: string) {
    const order = await this.repository.findOwnedOrder(userId, orderId);
    if (!order) throw new AudienceResourceNotFoundError('Order');
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.REFUNDED) {
      throw new AudienceResourceNotFoundError('Order confirmation');
    }
    return { order, generatedAt: new Date() };
  }
}
