import type { OrderStatus } from '../../ordering/domain/order-status.enum';
import type { TicketStatus } from '../../ordering/domain/ticket-status.enum';

export enum SupportRequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum SupportRequestCategory {
  ORDER_HELP = 'ORDER_HELP',
  TICKET_HELP = 'TICKET_HELP',
  PAYMENT_HELP = 'PAYMENT_HELP',
  REFUND_HELP = 'REFUND_HELP',
  ACCOUNT_HELP = 'ACCOUNT_HELP',
  OTHER = 'OTHER',
}

export enum RefundRequestStatus {
  REQUESTED = 'REQUESTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum RefundRequestReason {
  CANNOT_ATTEND = 'CANNOT_ATTEND',
  EVENT_CHANGED = 'EVENT_CHANGED',
  DUPLICATE_PURCHASE = 'DUPLICATE_PURCHASE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  OTHER = 'OTHER',
}

export interface SupportRequestStatusHistory {
  id: string;
  status: SupportRequestStatus;
  note: string | null;
  createdAt: Date;
}

export interface SupportRequestRecord {
  id: string;
  userId: string;
  orderId: string | null;
  ticketId: string | null;
  category: SupportRequestCategory;
  status: SupportRequestStatus;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: SupportRequestStatusHistory[];
}

export interface RefundRequestStatusHistory {
  id: string;
  status: RefundRequestStatus;
  note: string | null;
  createdAt: Date;
}

export interface RefundRequestRecord {
  id: string;
  userId: string;
  orderId: string;
  ticketId: string | null;
  status: RefundRequestStatus;
  reason: RefundRequestReason;
  message: string | null;
  requestedAmountVnd: number | null;
  requestedTicketCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: RefundRequestStatusHistory[];
}

export interface OwnedOrderResource {
  id: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  status: OrderStatus;
  totalAmountVnd: number;
  paidAt: Date | null;
  createdAt: Date;
  items: Array<{
    ticketTypeId: string;
    ticketTypeName?: string;
    quantity: number;
    unitPriceVnd: number;
    totalPriceVnd: number;
  }>;
  tickets: Array<{
    id: string;
    status: TicketStatus;
  }>;
  concert: {
    id: string;
    title: string;
    venueName: string;
    startsAt: Date;
  };
  payment: {
    provider: string | null;
    completedAt: Date | null;
  } | null;
}

export interface OwnedTicketResource {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  concertId: string;
  status: TicketStatus;
  issuedAt: Date;
  checkedInAt: Date | null;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketTypeCode: string;
  qrTokenHash: string;
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmountVnd: number;
    paidAt: Date | null;
    createdAt: Date;
  };
  concert: {
    id: string;
    title: string;
    venueName: string;
    startsAt: Date;
  };
}

export interface RefundEligibility {
  eligible: boolean;
  reasonCode:
    | 'ELIGIBLE'
    | 'ORDER_NOT_PAID'
    | 'ORDER_FINALIZED'
    | 'TICKET_NOT_REFUNDABLE'
    | 'DUPLICATE_ACTIVE_REQUEST'
    | 'NOT_FOUND';
  message: string;
  orderId: string | null;
  ticketId: string | null;
  refundableAmountVnd: number | null;
  refundableTicketCount: number | null;
  existingRequestId: string | null;
}
