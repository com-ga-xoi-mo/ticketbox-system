import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';
import { randomBytes } from 'crypto';

@Processor('resale-listing-expiry')
export class ResaleListingExpiryProcessor extends WorkerHost {
  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private listingRepo: IResaleListingRepository,
    @InjectQueue('compute-seller-trust') private trustQueue: Queue
  ) {
    super();
  }

  async process(job: Job) {
    const now = new Date();
    const expiredListings = await this.listingRepo.findActiveExpiredListings(now);

    if (expiredListings.length === 0) return;

    for (const listing of expiredListings) {
      const newQrHash = randomBytes(32).toString('hex');
      await this.listingRepo.expireListingAndCloseThreads(listing, newQrHash);
      await this.trustQueue.add('compute-trust', { sellerId: listing.sellerId });
    }
  }
}
