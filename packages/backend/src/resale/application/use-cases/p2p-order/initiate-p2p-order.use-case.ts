import { Injectable, Inject, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../../domain/ports/resale-listing-repository.port';
import { ISellerBankProfileRepository, SELLER_BANK_PROFILE_REPOSITORY } from '../../../../users/domain/ports/seller-bank-profile-repository.port';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../../platform/database/prisma.service';

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
    @InjectQueue('resale.order.reserved.expiry') private readonly expiryQueue: Queue,
    private readonly prisma: PrismaService, // For checking suspended user
  ) {}

  async execute(command: InitiateP2POrderCommand) {
    // Check buyer suspension
    const buyer = await this.prisma.user.findUnique({ where: { id: command.buyerId }});
    if ((buyer as any)?.resaleMarketSuspendedAt) {
      throw new ForbiddenException('BUYER_SUSPENDED', 'Tài khoản của bạn đã bị khóa tính năng mua lại vé.');
    }

    const listing = await this.listingRepo.findListingById(command.listingId);
    if (!listing) {
      throw new UnprocessableEntityException('LISTING_NOT_FOUND', 'Listing không tồn tại');
    }

    if (listing.sellerId === command.buyerId) {
      throw new ForbiddenException('SELF_PURCHASE_NOT_ALLOWED', 'Bạn không thể mua vé của chính mình.');
    }

    const bankProfile = await this.bankProfileRepo.findByUserId(listing.sellerId);
    if (!bankProfile) {
      throw new UnprocessableEntityException('SELLER_BANK_INFO_MISSING', 'Người bán chưa cung cấp thông tin tài khoản nhận tiền.');
    }

    // Call atomic repo method
    let order;
    try {
      order = await this.orderRepo.reserveForOrder(command.listingId, command.buyerId, listing.sellerId);
    } catch (e: any) {
      if (e.message === 'LISTING_NOT_AVAILABLE') {
        throw new ConflictException('LISTING_NOT_AVAILABLE', 'Vé này đã được mua hoặc đang có người giữ chỗ.');
      }
      throw e;
    }

    // Enqueue expiry job (15 minutes)
    await this.expiryQueue.add(
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
