export interface ResaleTransaction {
  id: string;
  listingId: string;
  sellerTicketId: string;
  buyerTicketId: string;
  buyerId: string;
  sellerId: string;
  salePriceVnd: number;
  platformFeeVnd: number;
  sellerPayoutVnd: number;
  payoutStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PROCESSED';
  payoutProcessedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  listing?: any;
}
