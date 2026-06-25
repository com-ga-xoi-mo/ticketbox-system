import type { TicketDetail, TicketSummary } from '../../domain/ticket-read.model';

export function serializeTicketSummary(ticket: TicketSummary) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    userId: ticket.userId,
    concertId: ticket.concertId,
    concertTitle: ticket.concertTitle,
    concertStartsAt: ticket.concertStartsAt.toISOString(),
    ticketTypeId: ticket.ticketTypeId,
    ticketTypeName: ticket.ticketTypeName,
    ticketTypeCode: ticket.ticketTypeCode,
    status: ticket.status,
    issuedAt: ticket.issuedAt.toISOString(),
    checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
  };
}

export function serializeTicketDetail(ticket: TicketDetail) {
  return {
    ...serializeTicketSummary(ticket),
    qrPayload: ticket.qrPayload,
  };
}
