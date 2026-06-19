import type { Ticket } from '../ticket.entity';
import type { TicketSummary } from '../ticket-read.model';

export const TICKET_REPOSITORY = Symbol('TicketRepository');

export interface PaidOrderTicketItem {
  id: string;
  ticketTypeId: string;
  quantity: number;
}

export interface PaidOrderForTicketIssuance {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  status: string;
  items: PaidOrderTicketItem[];
}

export interface TicketIssuePlan {
  id: string;
  ticketNumber: string;
  orderItemId: string;
  ticketTypeId: string;
  qrTokenHash: string;
  issuedAt: Date;
}

export interface IssueTicketsForPaidOrderData {
  orderId: string;
  createTickets(order: PaidOrderForTicketIssuance): TicketIssuePlan[];
}

export interface TicketRepositoryPort {
  issueTicketsForPaidOrder(data: IssueTicketsForPaidOrderData): Promise<Ticket[]>;
  findByUserId(userId: string): Promise<TicketSummary[]>;
  findByUserIdAndId(userId: string, ticketId: string): Promise<TicketSummary | null>;
}
