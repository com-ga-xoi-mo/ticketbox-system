export interface ResaleListing {
  id: string;
  ticketId: string;
  sellerId: string;
  concertId: string;
  ticketTypeId: string;
  askingPriceVnd: number;
  originalPriceVnd: number;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED' | 'RESERVED';
  upvoteCount: number;
  commentCount: number;
  createdAt: Date;
  expiresAt: Date;
  soldAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface ResaleListingFeedItem extends ResaleListing {
  sellerName?: string;
  sellerTrustTier?: string;
  ticketTypeName?: string;
  concertTitle?: string;
  concertSlug?: string;
  concertStartsAt?: Date;
  upvotedByMe?: boolean;
  currentOrderId?: string;
  currentOrderStatus?: 'RESERVED' | 'PENDING_CONFIRM' | 'IN_DISPUTE';
}

export interface ResaleListingDetail extends ResaleListing {
  seller?: { displayName: string };
  ticket?: any;
  concert?: any;
  ticketType?: any;
  sellerTrustTier?: string;
  comments?: any[];
  upvotedByMe?: boolean;
}
