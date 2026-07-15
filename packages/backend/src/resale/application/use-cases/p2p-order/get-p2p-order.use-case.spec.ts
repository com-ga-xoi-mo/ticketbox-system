import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { ISellerBankProfileRepository } from '../../../../users/domain/ports/seller-bank-profile-repository.port';
import type { IResaleListingRepository } from '../../../domain/ports/resale-listing-repository.port';
import type {
  IResaleOrderRepository,
  ResaleOrderData,
} from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { GetP2POrderUseCase } from './get-p2p-order.use-case';

const order = {
  id: 'order-1',
  listingId: 'listing-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  status: 'RESERVED',
} as ResaleOrderData;

describe('GetP2POrderUseCase', () => {
  it('returns transfer details and the exact resale amount for participants', async () => {
    const useCase = new GetP2POrderUseCase(
      { findById: vi.fn().mockResolvedValue(order) } as unknown as IResaleOrderRepository,
      {
        findListingById: vi.fn().mockResolvedValue({ askingPriceVnd: 850_000 }),
      } as unknown as IResaleListingRepository,
      {
        findByUserId: vi.fn().mockResolvedValue({
          bankName: 'MB',
          bankAccountNumber: '0123456789',
          bankAccountName: 'NGUYEN VAN A',
        }),
      } as unknown as ISellerBankProfileRepository,
    );

    await expect(useCase.execute({ orderId: order.id, userId: order.buyerId })).resolves.toEqual(
      expect.objectContaining({
        amountVnd: 850_000,
        bankInfo: {
          bankName: 'MB',
          bankAccountNumber: '0123456789',
          bankAccountName: 'NGUYEN VAN A',
        },
      }),
    );
  });

  it('does not expose order details to non-participants', async () => {
    const listingRepo = { findListingById: vi.fn() } as unknown as IResaleListingRepository;
    const bankProfileRepo = { findByUserId: vi.fn() } as unknown as ISellerBankProfileRepository;
    const useCase = new GetP2POrderUseCase(
      { findById: vi.fn().mockResolvedValue(order) } as unknown as IResaleOrderRepository,
      listingRepo,
      bankProfileRepo,
    );

    await expect(useCase.execute({ orderId: order.id, userId: 'outsider' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(listingRepo.findListingById).not.toHaveBeenCalled();
    expect(bankProfileRepo.findByUserId).not.toHaveBeenCalled();
  });
});
