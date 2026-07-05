import { Injectable, Inject } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';

@Injectable()
export class GetListingDetailUseCase {
  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
  ) {}

  async execute(listingId: string, userId?: string) {
    return this.listingRepo.getListingDetail(listingId, userId);
  }
}
