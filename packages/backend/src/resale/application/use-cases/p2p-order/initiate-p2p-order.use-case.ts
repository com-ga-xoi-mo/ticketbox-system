import { Injectable, Inject, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../../domain/ports/resale-listing-repository.port';
import { PrismaSellerBankProfileRepository } from '../../../../users/infrastructure/database/prisma-seller-bank-profile.repository';
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
    private readonly bankProfileRepo: PrismaSellerBankProfileRepository,
    @InjectQueue('resale.order.reserved.expiry') private readonly expiryQueue: Queue,
    private readonly prisma: PrismaService, // For checking suspended user and atomic update
  ) {}

  async execute(command: InitiateP2POrderCommand) {
    // Check buyer suspension
    const buyer = await this.prisma.user.findUnique({ where: { id: command.buyerId }});
    if ((buyer as any)?.resaleMarketSuspendedAt) {
      throw new ForbiddenException('BUYER_SUSPENDED', 'Tài khoản của bạn đã bị khóa tính năng mua lại vé.');
    }

    // Use transaction to atomically lock listing and create order
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Fetch and lock listing
      const listingRows = await tx.$queryRaw<any[]>`SELECT * FROM resale_listings WHERE id = ${command.listingId}::uuid FOR UPDATE`;
      if (!listingRows.length) {
        throw new UnprocessableEntityException('LISTING_NOT_FOUND', 'Listing không tồn tại');
      }
      const listing = listingRows[0];

      if (listing.status !== 'ACTIVE') {
        throw new ConflictException('LISTING_NOT_AVAILABLE', 'Vé này đã được mua hoặc đang có người giữ chỗ.');
      }

      if (listing.seller_id === command.buyerId) {
        throw new ForbiddenException('SELF_PURCHASE_NOT_ALLOWED', 'Bạn không thể mua vé của chính mình.');
      }

      const bankProfile = await this.bankProfileRepo.findByUserId(listing.seller_id);
      if (!bankProfile) {
        // Technically this shouldn't happen because we gated listing creation, but just in case
        throw new UnprocessableEntityException('SELLER_BANK_INFO_MISSING', 'Người bán chưa cung cấp thông tin tài khoản nhận tiền.');
      }

      // Update listing to RESERVED
      await tx.$queryRaw`UPDATE resale_listings SET status = 'RESERVED' WHERE id = ${command.listingId}::uuid`;

      // Create ResaleOrder
      const order = await tx.resaleOrder.create({
        data: {
          listingId: command.listingId,
          buyerId: command.buyerId,
          sellerId: listing.seller_id,
          status: 'RESERVED',
        }
      });

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
        amountVnd: listing.asking_price_vnd,
        bankInfo: {
          bankAccountName: bankProfile.bankAccountName,
          bankAccountNumber: bankProfile.bankAccountNumber,
          bankName: bankProfile.bankName,
        }
      };
    });
  }
}
