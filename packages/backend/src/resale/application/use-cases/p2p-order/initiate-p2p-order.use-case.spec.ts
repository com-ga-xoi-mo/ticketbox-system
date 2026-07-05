import { InitiateP2POrderUseCase } from './initiate-p2p-order.use-case';
import { IResaleOrderRepository } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IResaleListingRepository } from '../../../domain/ports/resale-listing-repository.port';
import { ISellerBankProfileRepository } from '../../../../users/domain/ports/seller-bank-profile-repository.port';
import { IEventPublisher } from '../../../domain/ports/event-publisher.port';
import { PrismaService } from '../../../../platform/database/prisma.service';
import * as errors from '../../../domain/errors';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('InitiateP2POrderUseCase', () => {
  let useCase: InitiateP2POrderUseCase;
  let orderRepo: import('vitest').Mocked<IResaleOrderRepository>;
  let listingRepo: import('vitest').Mocked<IResaleListingRepository>;
  let bankProfileRepo: import('vitest').Mocked<ISellerBankProfileRepository>;
  let eventPublisher: import('vitest').Mocked<IEventPublisher>;
  let prisma: import('vitest').Mocked<PrismaService>;

  beforeEach(() => {
    orderRepo = {
      reserveForOrder: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleOrderRepository>;

    listingRepo = {
      findListingById: vi.fn(),
    } as unknown as import('vitest').Mocked<IResaleListingRepository>;

    bankProfileRepo = {
      findByUserId: vi.fn(),
    } as unknown as import('vitest').Mocked<ISellerBankProfileRepository>;

    eventPublisher = {
      publish: vi.fn(),
    } as unknown as import('vitest').Mocked<IEventPublisher>;

    prisma = {
      user: {
        findUnique: vi.fn(),
      }
    } as any;

    useCase = new InitiateP2POrderUseCase(orderRepo, listingRepo, bankProfileRepo, eventPublisher, prisma);
  });

  it('throws ListingNotFoundError if listing does not exist', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({} as any);
    listingRepo.findListingById.mockResolvedValue(null);

    await expect(useCase.execute({ buyerId: 'buyer-1', listingId: 'listing-1' }))
      .rejects.toThrow(errors.ListingNotFoundError);
  });

  it('throws ListingNotAvailableError if listing is already reserved (repo throws)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({} as any);
    listingRepo.findListingById.mockResolvedValue({ sellerId: 'seller-1' } as any);
    bankProfileRepo.findByUserId.mockResolvedValue({} as any);

    orderRepo.reserveForOrder.mockRejectedValue(new Error('LISTING_NOT_AVAILABLE'));

    await expect(useCase.execute({ buyerId: 'buyer-1', listingId: 'listing-1' }))
      .rejects.toThrow(errors.ListingNotAvailableError);
  });

  it('successfully initiates order', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({} as any);
    listingRepo.findListingById.mockResolvedValue({ sellerId: 'seller-1', askingPriceVnd: 100000 } as any);
    bankProfileRepo.findByUserId.mockResolvedValue({ bankAccountName: 'Test', bankAccountNumber: '123', bankName: 'Bank' } as any);

    orderRepo.reserveForOrder.mockResolvedValue({ id: 'order-1', status: 'RESERVED' } as any);

    const result = await useCase.execute({ buyerId: 'buyer-1', listingId: 'listing-1' });

    expect(result.orderId).toBe('order-1');
    expect(result.status).toBe('RESERVED');
    expect(eventPublisher.publish).toHaveBeenCalledWith('expire-reserved-order', { orderId: 'order-1' }, { delay: 900000 });
  });
});
