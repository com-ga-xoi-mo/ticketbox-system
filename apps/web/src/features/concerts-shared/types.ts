export type ConcertStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'ENDED';

export interface ConcertAssetMetadata {
  id: string;
  kind: string;
  status: string;
  publicUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
}

export interface ConcertLinkedArtist {
  id: string;
  slug?: string;
  displayName: string;
  status: string;
  avatarAsset?: ConcertAssetMetadata | null;
  displayOrder: number;
}

export interface Concert {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  venueName: string;
  venueAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city: string;
  startsAt: string; // ISO date string
  endsAt: string; // ISO date string
  description?: string | null;
  status: ConcertStatus | string;
  eventType?: string;
  artists?: ConcertLinkedArtist[];
  isFeatured?: boolean;
  displayOrder?: number;
  posterAssetId?: string | null;
  posterAsset?: ConcertAssetMetadata | null;
  bannerAssetId?: string | null;
  bannerAsset?: ConcertAssetMetadata | null;
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
