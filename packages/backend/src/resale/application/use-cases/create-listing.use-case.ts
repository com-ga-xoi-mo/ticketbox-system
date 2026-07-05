import { Injectable, Inject } from '@nestjs/common';
import { IResaleListingRepository, RESALE_LISTING_REPOSITORY } from '../../domain/ports/resale-listing-repository.port';
import { IResaleTicketProvider, RESALE_TICKET_PROVIDER } from '../../domain/ports/resale-ticket-provider.port';
import * as errors from '../../domain/errors';
import { PrismaSellerBankProfileRepository } from '../../../users/infrastructure/database/prisma-seller-bank-profile.repository';
import { UnprocessableEntityException } from '@nestjs/common';

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(RESALE_LISTING_REPOSITORY) private readonly listingRepo: IResaleListingRepository,
    @Inject(RESALE_TICKET_PROVIDER) private readonly ticketProvider: IResaleTicketProvider,
    private readonly bankProfileRepo: PrismaSellerBankProfileRepository,
  ) {}

  async execute(userId: string, ticketId: string, askingPriceVnd: number) {
    const bankProfile = await this.bankProfileRepo.findByUserId(userId);
    if (!bankProfile) {
      throw new UnprocessableEntityException('BANK_PROFILE_REQUIRED', 'Vui lòng cập nhật tài khoản nhận tiền trước khi đăng bán vé.');
    }

    const ticket = await this.ticketProvider.findTicketById(ticketId);

    if (!ticket) throw new errors.ListingNotFoundError(ticketId); // re-using error or create TicketNotFoundError
    
    console.log(`[CREATE LISTING] Check Ownership: ticket.userId=${ticket.userId} vs request userId=${userId}`);
    if (ticket.userId !== userId) throw new errors.NotTicketOwnerError();
    if (ticket.status !== 'ISSUED') throw new errors.TicketNotIssuedError();
    if (!ticket.concert.resaleEnabled) throw new errors.EventResaleDisabledError();
    
    const cutoff = new Date(ticket.concert.startsAt.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() >= cutoff) throw new errors.ResaleCutoffWindowPassedError();

    if (!ticket.orderId) throw new errors.GuestListResaleNotAllowedError();

    const maxAllowedPrice = ticket.ticketType.priceVnd * (ticket.concert.resaleMaxPricePercent / 100);
    if (askingPriceVnd > maxAllowedPrice) {
      throw new errors.PriceExceedsCapError();
    }

    const voidedQrHash = 'voided_' + Date.now() + '_' + ticket.qrTokenHash;

    return this.listingRepo.createListing({
      ticket,
      sellerId: userId,
      askingPriceVnd,
      voidedQrHash,
      cutoff
    });
  }
}
