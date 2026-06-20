export interface Concert {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  description: string | null;
  venueName: string;
  venueAddress: string | null;
  city: string;
  startsAt: Date;
  endsAt: Date;
  status: string; // DRAFT, PUBLISHED, CANCELLED, ENDED
  createdById: string;
  posterAssetId: string | null;
  seatingMapAssetId: string | null;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ticketTypesCount?: number;
  seatingZonesCount?: number;
  checkinStaffCount?: number;
  seatingMapConfigured?: boolean;
}

export interface TicketType {
  id: string;
  concertId: string;
  code: string;
  name: string;
  description: string | null;
  priceVnd: number;
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  maxPerUser: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  status: string; // ACTIVE, PAUSED, SOLD_OUT, ARCHIVED
  createdAt: Date;
  updatedAt: Date;
}
