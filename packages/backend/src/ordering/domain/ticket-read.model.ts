import { TicketStatus } from './ticket-status.enum';

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  concertTitle: string;
  concertStartsAt: Date;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketTypeCode: string;
  status: TicketStatus;
  issuedAt: Date;
  checkedInAt: Date | null;
}

export interface TicketDetail extends TicketSummary {
  qrPayload: string;
}
