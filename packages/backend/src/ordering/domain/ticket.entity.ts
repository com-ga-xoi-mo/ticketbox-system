import { TicketStatus } from './ticket-status.enum';

export interface TicketProps {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  qrTokenHash: string;
  status: TicketStatus;
  issuedAt: Date;
  checkedInAt?: Date | null;
  voidedAt?: Date | null;
}

export class Ticket {
  readonly id: string;
  readonly ticketNumber: string;
  readonly orderId: string;
  readonly orderItemId: string;
  readonly userId: string;
  readonly concertId: string;
  readonly ticketTypeId: string;
  readonly qrTokenHash: string;
  readonly status: TicketStatus;
  readonly issuedAt: Date;
  readonly checkedInAt: Date | null;
  readonly voidedAt: Date | null;

  constructor(props: TicketProps) {
    this.id = props.id;
    this.ticketNumber = props.ticketNumber;
    this.orderId = props.orderId;
    this.orderItemId = props.orderItemId;
    this.userId = props.userId;
    this.concertId = props.concertId;
    this.ticketTypeId = props.ticketTypeId;
    this.qrTokenHash = props.qrTokenHash;
    this.status = props.status;
    this.issuedAt = props.issuedAt;
    this.checkedInAt = props.checkedInAt ?? null;
    this.voidedAt = props.voidedAt ?? null;
  }
}
