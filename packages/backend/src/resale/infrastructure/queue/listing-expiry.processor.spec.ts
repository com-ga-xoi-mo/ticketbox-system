import { ResaleListingExpiryProcessor } from './listing-expiry.processor';
import { IResaleListingRepository } from '../../domain/ports/resale-listing-repository.port';
import { Queue, Job } from 'bullmq';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ResaleListingExpiryProcessor', () => {
  let processor: ResaleListingExpiryProcessor;
  let listingRepo: import('vitest').Mocked<IResaleListingRepository>;
  let trustQueue: import('vitest').Mocked<Queue>;

  beforeEach(() => {
    listingRepo = {
      findActiveExpiredListings: vi.fn(),
      expireListingsBatchAndCloseThreads: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleListingRepository>;

    trustQueue = {
      add: vi.fn(),
    } as unknown as import('vitest').Mocked<Queue>;

    processor = new ResaleListingExpiryProcessor(listingRepo, trustQueue);
  });

  it('re-throws error so BullMQ can retry', async () => {
    listingRepo.findActiveExpiredListings.mockRejectedValue(new Error('DB failure'));

    await expect(processor.process({} as Job)).rejects.toThrow('DB failure');
  });

  it('chunks listings into batches and processes them', async () => {
    const fakeListings = Array(120).fill(0).map((_, i) => ({ id: `l-${i}`, sellerId: `s-${i}`, ticketId: `t-${i}`, status: 'ACTIVE' }));
    listingRepo.findActiveExpiredListings.mockResolvedValue(fakeListings as any);

    await processor.process({} as Job);

    // 120 items with batch size 50 = 3 batches
    expect(listingRepo.expireListingsBatchAndCloseThreads).toHaveBeenCalledTimes(3);
    expect(listingRepo.expireListingsBatchAndCloseThreads).toHaveBeenNthCalledWith(1, fakeListings.slice(0, 50));
    expect(listingRepo.expireListingsBatchAndCloseThreads).toHaveBeenNthCalledWith(2, fakeListings.slice(50, 100));
    expect(listingRepo.expireListingsBatchAndCloseThreads).toHaveBeenNthCalledWith(3, fakeListings.slice(100, 120));

    expect(trustQueue.add).toHaveBeenCalledTimes(120);
  });
});
