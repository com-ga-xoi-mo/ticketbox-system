import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleTransferRepository } from '../../domain/ports/resale-transfer-repository.port';
import * as errors from '../../domain/errors';
import { randomBytes } from 'crypto';

@Injectable()
export class PrismaResaleTransferRepository implements IResaleTransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async executePurchase(buyerId: string, listingId: string, newQrHash: string) {
    let sellerIdToUpdate = '';

    const transaction = await this.prisma.$transaction(async (tx) => {
      const lockRes = await tx.$queryRawUnsafe<any[]>('SELECT * FROM resale_listings WHERE id = $1::uuid FOR UPDATE', listingId);
      if (!lockRes || lockRes.length === 0) throw new errors.ListingNotFoundError();

      const listing = lockRes[0];
      if (listing.status !== 'ACTIVE') throw new errors.ListingNotActiveError();
      if (listing.seller_id === buyerId) throw new errors.SelfPurchaseNotAllowedError();
      if (new Date() >= listing.expires_at) throw new errors.ListingExpiredError();

      const ticket = await tx.ticket.findUnique({ where: { id: listing.ticket_id } });
      if (!ticket) throw new Error('Original ticket not found');

      const salePrice = listing.asking_price_vnd;
      const platformFee = Math.floor(salePrice * 0.05);
      const sellerPayout = salePrice - platformFee;

      sellerIdToUpdate = listing.seller_id;

      await tx.resaleListing.update({
        where: { id: listing.id },
        data: { status: 'SOLD', soldAt: new Date() }
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'TRANSFERRED', transferredAt: new Date() }
      });

      const orderNumber = 'R-' + Date.now() + '-' + randomBytes(4).toString('hex').toUpperCase();
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: buyerId,
          concertId: ticket.concertId,
          status: 'PAID',
          orderSourceType: 'RESALE',
          subtotalVnd: salePrice,
          totalAmountVnd: salePrice,
          paidAt: new Date(),
        }
      });

      const newTicket = await tx.ticket.create({
        data: {
          ticketNumber: 'T-' + randomBytes(6).toString('hex').toUpperCase(),
          orderId: newOrder.id,
          orderItemId: ticket.orderItemId,
          userId: buyerId,
          concertId: ticket.concertId,
          ticketTypeId: ticket.ticketTypeId,
          qrTokenHash: newQrHash,
          status: 'ISSUED',
        }
      });

      const txRecord = await tx.resaleTransaction.create({
        data: {
          listingId: listing.id,
          sellerTicketId: ticket.id,
          buyerTicketId: newTicket.id,
          buyerId: buyerId,
          sellerId: listing.seller_id,
          salePriceVnd: salePrice,
          platformFeeVnd: platformFee,
          sellerPayoutVnd: sellerPayout,
          payoutStatus: 'PENDING',
        }
      });

      await tx.directMessageThread.updateMany({
        where: { listingId: listing.id },
        data: { isClosed: true }
      });

      return txRecord;
    });

    return { transaction, sellerIdToUpdate };
  }
}
