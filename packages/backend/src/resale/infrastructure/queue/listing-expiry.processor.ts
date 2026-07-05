import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';

@Processor('resale-listing-expiry')
export class ResaleListingExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(ResaleListingExpiryProcessor.name);
  private readonly BATCH_SIZE = 50;

  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private listingRepo: IResaleListingRepository,
    @InjectQueue('compute-seller-trust') private trustQueue: Queue
  ) {
    super();
  }

  async process(job: Job) {
    try {
      const now = new Date();
      const expiredListings = await this.listingRepo.findActiveExpiredListings(now);

      if (expiredListings.length === 0) return;

      // Chunk into batches
      for (let i = 0; i < expiredListings.length; i += this.BATCH_SIZE) {
        const batch = expiredListings.slice(i, i + this.BATCH_SIZE);
        await this.listingRepo.expireListingsBatchAndCloseThreads(batch);
        
        for (const listing of batch) {
          await this.trustQueue.add('compute-trust', { sellerId: listing.sellerId });
        }
      }
    } catch (err) {
      this.logger.error('Failed to process listing expiry batch', err);
      throw err;
    }
  }
}
