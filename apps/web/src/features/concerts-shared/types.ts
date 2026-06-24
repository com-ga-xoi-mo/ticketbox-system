export type ConcertStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'ENDED';

export interface Concert {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  venueAddress?: string | null;
  city: string;
  startsAt: string; // ISO date string
  endsAt: string; // ISO date string
  description?: string | null;
  status: ConcertStatus | string;
  posterAssetId?: string | null;
  seatingMapAssetId?: string | null;
  publishedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  ticketTypesCount?: number;
  seatingZonesCount?: number;
  checkinStaffCount?: number;
  seatingMapConfigured?: boolean;
}
