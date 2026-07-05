import { Injectable, Inject } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';
import { randomBytes } from 'crypto';
import * as errors from '../../domain/errors';

@Injectable()
export class CancelListingUseCase {
  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
  ) {}

  async execute(userId: string, listingId: string) {
    const listing = await this.listingRepo.findListingById(listingId);
    if (!listing) throw new errors.ListingNotFoundError(listingId);
    if (listing.sellerId !== userId) throw new errors.NotTicketOwnerError();
    if (listing.status !== 'ACTIVE') throw new errors.ListingNotActiveError();

    await this.listingRepo.cancelListing(listingId);
    return { success: true };
  }
}
