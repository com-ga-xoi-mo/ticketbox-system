export const RESALE_LISTING_REPOSITORY = Symbol('RESALE_LISTING_REPOSITORY');

export interface IResaleListingRepository {
  createListing(data: any): Promise<any>;
  cancelListing(listingId: string): Promise<void>;
  findListingById(id: string): Promise<any>;
  findListingsBySeller(sellerId: string): Promise<any[]>;
  getFeed(params: any): Promise<any[]>;
  getListingDetail(listingId: string, userId?: string): Promise<any>;
  findActiveExpiredListings(now: Date): Promise<any[]>;
  expireListingAndCloseThreads(listing: any, newQrHash: string): Promise<void>;
}
