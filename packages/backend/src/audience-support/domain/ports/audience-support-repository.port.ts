import type {
  RefundRequestReason,
  RefundRequestRecord,
  SupportRequestCategory,
  SupportRequestRecord,
  OwnedOrderResource,
  OwnedTicketResource,
} from '../support.types';

export const AUDIENCE_SUPPORT_REPOSITORY = Symbol('AudienceSupportRepository');

export interface CreateSupportRequestInput {
  userId: string;
  orderId?: string | null;
  ticketId?: string | null;
  category: SupportRequestCategory;
  subject: string;
  message: string;
}

export interface CreateRefundRequestInput {
  userId: string;
  orderId: string;
  ticketId?: string | null;
  reason: RefundRequestReason;
  message?: string | null;
  requestedAmountVnd?: number | null;
  requestedTicketCount?: number | null;
}

export interface AudienceSupportRepositoryPort {
  findOwnedOrder(userId: string, orderId: string): Promise<OwnedOrderResource | null>;
  findOwnedTicket(userId: string, ticketId: string): Promise<OwnedTicketResource | null>;
  createSupportRequest(input: CreateSupportRequestInput): Promise<SupportRequestRecord>;
  listSupportRequests(userId: string): Promise<SupportRequestRecord[]>;
  findSupportRequest(userId: string, requestId: string): Promise<SupportRequestRecord | null>;
  createRefundRequest(input: CreateRefundRequestInput): Promise<RefundRequestRecord>;
  listRefundRequests(userId: string): Promise<RefundRequestRecord[]>;
  findRefundRequest(userId: string, requestId: string): Promise<RefundRequestRecord | null>;
  findActiveRefundRequest(input: {
    userId: string;
    orderId?: string | null;
    ticketId?: string | null;
  }): Promise<RefundRequestRecord | null>;
}
