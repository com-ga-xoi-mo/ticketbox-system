import { Injectable, Inject } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';

@Injectable()
export class GetFeedUseCase {
  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
  ) {}

  async execute(params: any) {
    return this.listingRepo.getFeed(params);
  }
}
