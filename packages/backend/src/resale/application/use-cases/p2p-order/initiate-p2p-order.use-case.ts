import { Injectable, Inject } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../../domain/ports/resale-listing-repository.port';
import { ISellerBankProfileRepository, SELLER_BANK_PROFILE_REPOSITORY } from '../../../../users/domain/ports/seller-bank-profile-repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../../domain/ports/event-publisher.port';
import { PrismaService } from '../../../../platform/database/prisma.service';
import * as errors from '../../../domain/errors';

export interface InitiateP2POrderCommand {
  listingId: string;
  buyerId: string;
}

@Injectable()
export class InitiateP2POrderUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
    @Inject(SELLER_BANK_PROFILE_REPOSITORY) private readonly bankProfileRepo: ISellerBankProfileRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    private readonly prisma: PrismaService, // For checking suspended user
  ) {}

  async execute(command: InitiateP2POrderCommand) {
    // Check buyer suspension
    const buyer = await this.prisma.user.findUnique({ where: { id: command.buyerId }});
    if ((buyer as any)?.resaleMarketSuspendedAt) {
      throw new errors.BuyerSuspendedError();
    }

    const listing = await this.listingRepo.findListingById(command.listingId);
    if (!listing) {
      throw new errors.ListingNotFoundError();
    }

    if (listing.sellerId === command.buyerId) {
      throw new errors.SelfPurchaseNotAllowedError();
    }

    const bankProfile = await this.bankProfileRepo.findByUserId(listing.sellerId);
    if (!bankProfile) {
      throw new errors.SellerBankInfoMissingError();
    }

    // Call atomic repo method
    let order;
    try {
      order = await this.orderRepo.reserveForOrder(command.listingId, command.buyerId, listing.sellerId);
    } catch (e: any) {
      if (e.message === 'LISTING_NOT_AVAILABLE') {
        throw new errors.ListingNotAvailableError();
      }
      throw e;
    }

    // Enqueue expiry job (15 minutes)
    await this.eventPublisher.publish(
      'expire-reserved-order',
      { orderId: order.id },
      { delay: 15 * 60 * 1000 }
    );

    // Return order and bank info
    return {
      orderId: order.id,
      status: order.status,
      amountVnd: listing.askingPriceVnd,
      bankInfo: {
        bankAccountName: bankProfile.bankAccountName,
        bankAccountNumber: bankProfile.bankAccountNumber,
        bankName: bankProfile.bankName,
      }
    };
  }
}
