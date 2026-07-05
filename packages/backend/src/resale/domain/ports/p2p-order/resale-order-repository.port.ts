import { ResaleOrderStatus } from '../../resale-order-status';

export interface ResaleOrderData {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: ResaleOrderStatus;
  paymentProofUrl: string | null;
  disputeReason: string | null;
  disputeRaisedBy: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  reservedAt: Date;
  paymentConfirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  disputedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface IResaleOrderRepository {
  create(data: {
    listingId: string;
    buyerId: string;
    sellerId: string;
    status: ResaleOrderStatus;
  }): Promise<ResaleOrderData>;

  findById(id: string): Promise<ResaleOrderData | null>;

  updateStatus(id: string, status: ResaleOrderStatus, extraFields?: Partial<ResaleOrderData>): Promise<ResaleOrderData>;

  findActiveByListingId(listingId: string): Promise<ResaleOrderData | null>;

  cancelWithRefund(orderId: string): Promise<ResaleOrderData>;
  resolveDispute(orderId: string, outcome: 'complete' | 'cancel', note: string): Promise<ResaleOrderData>;
  reserveForOrder(listingId: string, buyerId: string, sellerId: string): Promise<ResaleOrderData>;
}

export const RESALE_ORDER_REPOSITORY = 'RESALE_ORDER_REPOSITORY';
