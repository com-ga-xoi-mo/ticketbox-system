import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateListingUseCase } from './create-listing.use-case';
import { IResaleListingRepository } from '../../domain/ports/resale-listing-repository.port';
import { IResaleTicketProvider } from '../../domain/ports/resale-ticket-provider.port';
import * as errors from '../../domain/errors';

describe('CreateListingUseCase', () => {
  let useCase: CreateListingUseCase;
  let listingRepo: IResaleListingRepository;
  let ticketProvider: IResaleTicketProvider;

  beforeEach(() => {
    listingRepo = {
      createListing: vi.fn(),
    } as any;

    ticketProvider = {
      findTicketById: vi.fn(),
    } as any;

    useCase = new CreateListingUseCase(listingRepo, ticketProvider);
  });

  it('rejects if ticket not found', async () => {
    (ticketProvider.findTicketById as any).mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 100)).rejects.toThrow(errors.ListingNotFoundError);
  });

  it('creates listing when valid', async () => {
    (ticketProvider.findTicketById as any).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      status: 'ISSUED',
      orderId: 'o1',
      qrTokenHash: 'qr1',
      ticketType: { priceVnd: 1000 },
      concert: { resaleEnabled: true, resaleMaxPricePercent: 110, startsAt: new Date(Date.now() + 100000000) }
    });

    await useCase.execute('u1', 't1', 1100);
    expect(listingRepo.createListing).toHaveBeenCalledWith(expect.objectContaining({
      sellerId: 'u1',
      askingPriceVnd: 1100
    }));
  });

  it('rejects if over price cap', async () => {
    (ticketProvider.findTicketById as any).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      status: 'ISSUED',
      orderId: 'o1',
      qrTokenHash: 'qr1',
      ticketType: { priceVnd: 1000 },
      concert: { resaleEnabled: true, resaleMaxPricePercent: 110, startsAt: new Date(Date.now() + 100000000) }
    });

    await expect(useCase.execute('u1', 't1', 1101)).rejects.toThrow(errors.PriceExceedsCapError);
  });
});
