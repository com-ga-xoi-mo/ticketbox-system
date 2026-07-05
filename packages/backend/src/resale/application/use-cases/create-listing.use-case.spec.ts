import { CreateListingUseCase } from './create-listing.use-case';
import { IResaleListingRepository } from '../../domain/ports/resale-listing-repository.port';
import { IResaleTicketProvider } from '../../domain/ports/resale-ticket-provider.port';
import { ISellerBankProfileRepository } from '../../../users/domain/ports/seller-bank-profile-repository.port';
import * as errors from '../../domain/errors';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CreateListingUseCase', () => {
  let useCase: CreateListingUseCase;
  let listingRepo: import('vitest').Mocked<IResaleListingRepository>;
  let ticketProvider: import('vitest').Mocked<IResaleTicketProvider>;
  let bankProfileRepo: import('vitest').Mocked<ISellerBankProfileRepository>;

  beforeEach(() => {
    listingRepo = {
      createListing: vi.fn(),
      cancelListing: vi.fn(),
      findListingById: vi.fn(),
      findListingsBySeller: vi.fn(),
      getFeed: vi.fn(),
      getListingDetail: vi.fn(),
      findActiveExpiredListings: vi.fn(),
      expireListingsBatchAndCloseThreads: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleListingRepository>;

    ticketProvider = {
      findTicketById: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleTicketProvider>;

    bankProfileRepo = {
      findByUserId: vi.fn(),
      upsert: vi.fn(),
    } as unknown as import('vitest').Mocked<ISellerBankProfileRepository>;

    useCase = new CreateListingUseCase(listingRepo, ticketProvider, bankProfileRepo);
  });

  it('throws SellerBankInfoMissingError if seller has no bank profile', async () => {
    bankProfileRepo.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('user-1', 'ticket-1', 100000))
      .rejects.toThrow(errors.SellerBankInfoMissingError);
  });

  it('creates listing successfully if bank profile exists and ticket is valid', async () => {
    bankProfileRepo.findByUserId.mockResolvedValue({ userId: 'user-1' } as any);
    ticketProvider.findTicketById.mockResolvedValue({
      userId: 'user-1',
      status: 'ISSUED',
      orderId: 'order-1',
      concert: { resaleEnabled: true, startsAt: new Date(Date.now() + 86400000), resaleMaxPricePercent: 150 },
      ticketType: { priceVnd: 100000 },
      qrTokenHash: 'hash'
    } as any);

    listingRepo.createListing.mockResolvedValue({ id: 'listing-1' } as any);

    const result = await useCase.execute('user-1', 'ticket-1', 120000);
    expect(result).toEqual({ id: 'listing-1' });
    expect(listingRepo.createListing).toHaveBeenCalled();
  });
});
