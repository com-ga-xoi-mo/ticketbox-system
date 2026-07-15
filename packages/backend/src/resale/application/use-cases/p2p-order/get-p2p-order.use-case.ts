import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  IResaleOrderRepository,
  RESALE_ORDER_REPOSITORY,
} from '../../../domain/ports/p2p-order/resale-order-repository.port';
import {
  IResaleListingRepository,
  RESALE_LISTING_REPOSITORY,
} from '../../../domain/ports/resale-listing-repository.port';
import {
  ISellerBankProfileRepository,
  SELLER_BANK_PROFILE_REPOSITORY,
} from '../../../../users/domain/ports/seller-bank-profile-repository.port';

export interface GetP2POrderCommand {
  orderId: string;
  userId: string;
}

@Injectable()
export class GetP2POrderUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
    @Inject(SELLER_BANK_PROFILE_REPOSITORY)
    private readonly bankProfileRepo: ISellerBankProfileRepository,
  ) {}

  async execute(command: GetP2POrderCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId) {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    const [listing, bankProfile] = await Promise.all([
      this.listingRepo.findListingById(order.listingId),
      this.bankProfileRepo.findByUserId(order.sellerId),
    ]);

    return {
      ...order,
      amountVnd: listing?.askingPriceVnd ?? null,
      bankInfo: bankProfile
        ? {
            bankAccountName: bankProfile.bankAccountName,
            bankAccountNumber: bankProfile.bankAccountNumber,
            bankName: bankProfile.bankName,
          }
        : null,
    };
  }
}
