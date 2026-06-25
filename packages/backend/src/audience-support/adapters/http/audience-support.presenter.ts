import type {
  RefundEligibility,
  RefundRequestRecord,
  SupportRequestRecord,
  OwnedOrderResource,
  OwnedTicketResource,
} from '../../domain/support.types';

export function serializeSupportRequest(request: SupportRequestRecord) {
  return {
    id: request.id,
    userId: request.userId,
    orderId: request.orderId,
    ticketId: request.ticketId,
    category: request.category,
    status: request.status,
    subject: request.subject,
    message: request.message,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    statusHistory: request.statusHistory.map((item) => ({
      id: item.id,
      status: item.status,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export function serializeRefundEligibility(eligibility: RefundEligibility) {
  return eligibility;
}

export function serializeRefundRequest(request: RefundRequestRecord) {
  return {
    id: request.id,
    userId: request.userId,
    orderId: request.orderId,
    ticketId: request.ticketId,
    status: request.status,
    reason: request.reason,
    message: request.message,
    requestedAmountVnd: request.requestedAmountVnd,
    requestedTicketCount: request.requestedTicketCount,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    statusHistory: request.statusHistory.map((item) => ({
      id: item.id,
      status: item.status,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export function serializeTicketDownload(input: {
  ticket: OwnedTicketResource;
  qrPayload: string | null;
  generatedAt: Date;
}) {
  return {
    label: 'Ticket',
    ticket: {
      id: input.ticket.id,
      ticketNumber: input.ticket.ticketNumber,
      status: input.ticket.status,
      ticketTypeName: input.ticket.ticketTypeName,
      ticketTypeCode: input.ticket.ticketTypeCode,
      issuedAt: input.ticket.issuedAt.toISOString(),
      qrPayload: input.qrPayload,
    },
    order: {
      id: input.ticket.order.id,
      orderNumber: input.ticket.order.orderNumber,
      status: input.ticket.order.status,
    },
    concert: {
      id: input.ticket.concert.id,
      title: input.ticket.concert.title,
      venueName: input.ticket.concert.venueName,
      startsAt: input.ticket.concert.startsAt.toISOString(),
    },
    generatedAt: input.generatedAt.toISOString(),
  };
}

export function serializeOrderConfirmation(input: {
  order: OwnedOrderResource;
  generatedAt: Date;
}) {
  return {
    label: 'Purchase confirmation',
    order: {
      id: input.order.id,
      orderNumber: input.order.orderNumber,
      status: input.order.status,
      totalAmountVnd: input.order.totalAmountVnd,
      paidAt: input.order.paidAt?.toISOString() ?? null,
      createdAt: input.order.createdAt.toISOString(),
    },
    concert: {
      id: input.order.concert.id,
      title: input.order.concert.title,
      venueName: input.order.concert.venueName,
      startsAt: input.order.concert.startsAt.toISOString(),
    },
    lineItems: input.order.items,
    payment: {
      provider: input.order.payment?.provider ?? null,
      completedAt: input.order.payment?.completedAt?.toISOString() ?? null,
    },
    generatedAt: input.generatedAt.toISOString(),
  };
}
