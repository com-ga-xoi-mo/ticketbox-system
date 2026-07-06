import { ResaleListing, ResaleListingFeedItem, ResaleListingDetail } from '../resale-listing.entity';

export const RESALE_LISTING_REPOSITORY = Symbol('RESALE_LISTING_REPOSITORY');

export interface CreateListingData {
  ticket: any;
  sellerId: string;
  askingPriceVnd: number;
  voidedQrHash: string;
  cutoff: Date;
}

export interface IResaleListingRepository {
  createListing(data: CreateListingData): Promise<ResaleListing>;
  cancelListing(listingId: string): Promise<void>;
  findListingById(id: string): Promise<ResaleListing | null>;
  findListingsBySeller(sellerId: string): Promise<ResaleListing[]>;
  getFeed(params: any): Promise<ResaleListingFeedItem[]>;
  getListingDetail(listingId: string, userId?: string): Promise<ResaleListingDetail | null>;
  findActiveExpiredListings(now: Date): Promise<ResaleListing[]>;
  expireListingsBatchAndCloseThreads(listings: Pick<ResaleListing, 'id' | 'ticketId' | 'status'>[]): Promise<void>;
}
