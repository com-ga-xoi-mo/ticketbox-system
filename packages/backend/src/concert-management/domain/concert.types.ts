import type { AssetMetadata } from './catalog.types';

export interface ManagementArtistSummary {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  avatarAsset?: AssetMetadata | null;
  displayOrder: number;
}

export interface Concert {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  description: string | null;
  venueName: string;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string;
  startsAt: Date;
  endsAt: Date;
  status: string; // DRAFT, PUBLISHED, CANCELLED, ENDED
  eventType: string;
  isFeatured: boolean;
  displayOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  createdById: string;
  posterAssetId: string | null;
  bannerAssetId: string | null;
  posterAsset?: AssetMetadata | null;
  bannerAsset?: AssetMetadata | null;
  artists?: ManagementArtistSummary[];
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
