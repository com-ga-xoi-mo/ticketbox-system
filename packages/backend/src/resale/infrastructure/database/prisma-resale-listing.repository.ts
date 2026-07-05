import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleListingRepository } from '../../domain/ports/resale-listing-repository.port';
import * as errors from '../../domain/errors';

@Injectable()
export class PrismaResaleListingRepository implements IResaleListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createListing(data: any) {
    return this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: data.ticket.id },
        data: { status: 'LISTED_FOR_RESALE', qrTokenHash: data.voidedQrHash },
      });
      return tx.resaleListing.create({
        data: {
          ticketId: data.ticket.id,
          sellerId: data.sellerId,
          concertId: data.ticket.concertId,
          ticketTypeId: data.ticket.ticketTypeId,
          askingPriceVnd: data.askingPriceVnd,
          originalPriceVnd: data.ticket.ticketType.priceVnd,
          status: 'ACTIVE',
          expiresAt: data.cutoff,
        },
      });
    });
  }

  async cancelListing(listingId: string) {
    const newQrHash = require('crypto').randomBytes(32).toString('hex');
    await this.prisma.$transaction(async (tx) => {
      const listing = await tx.resaleListing.update({
        where: { id: listingId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.ticket.update({
        where: { id: listing.ticketId },
        data: { status: 'ISSUED', qrTokenHash: newQrHash },
      });
    });
  }

  async findListingById(id: string) {
    return this.prisma.resaleListing.findUnique({ where: { id } });
  }

  async findListingsBySeller(sellerId: string) {
    return this.prisma.resaleListing.findMany({
      where: { sellerId },
      include: { ticket: true, concert: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeed(params: any) {
    const { concertId, sort, page, limit, userId } = params;
    const offset = (page - 1) * limit;

    let orderByClause = '';
    if (sort === 'trending') {
      orderByClause = 'ORDER BY (l.upvote_count * 1.5 + l.comment_count * 0.5 - (EXTRACT(EPOCH FROM (now() - l.created_at)) / 3600) * 0.1) DESC';
    } else if (sort === 'newest') {
      orderByClause = 'ORDER BY l.created_at DESC';
    } else if (sort === 'price_asc') {
      orderByClause = 'ORDER BY l.asking_price_vnd ASC';
    } else if (sort === 'price_desc') {
      orderByClause = 'ORDER BY l.asking_price_vnd DESC';
    }

    const whereClause = `WHERE l.status = 'ACTIVE'${concertId ? ' AND l.concert_id = $1::uuid' : ''}`;
    const userSelect = userId ? `, EXISTS(SELECT 1 FROM listing_upvotes u WHERE u.listing_id = l.id AND u.user_id = ${concertId ? '$2::uuid' : '$1::uuid'}) as "upvotedByMe"` : '';

    const queryParams: any[] = [];
    if (concertId) queryParams.push(concertId);
    if (userId) queryParams.push(userId);
    queryParams.push(limit);
    queryParams.push(offset);
    
    const limitOffsetParams = concertId && userId ? 'LIMIT $3 OFFSET $4' : (concertId || userId ? 'LIMIT $2 OFFSET $3' : 'LIMIT $1 OFFSET $2');

    const query = `
      SELECT 
        l.id,
        l.ticket_id as "ticketId",
        l.seller_id as "sellerId",
        l.concert_id as "concertId",
        l.ticket_type_id as "ticketTypeId",
        l.asking_price_vnd as "askingPriceVnd",
        l.original_price_vnd as "originalPriceVnd",
        l.status,
        l.upvote_count as "upvoteCount",
        l.comment_count as "commentCount",
        l.created_at as "createdAt",
        l.expires_at as "expiresAt",
        u.display_name as "sellerName",
        tp.tier as "sellerTrustTier",
        tt.name as "ticketTypeName"
        ${userSelect}
      FROM resale_listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN seller_trust_profiles tp ON l.seller_id = tp.user_id
      LEFT JOIN ticket_types tt ON l.ticket_type_id = tt.id
      ${whereClause}
      ${orderByClause}
      ${limitOffsetParams}
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...queryParams);
    return results.map(r => ({ ...r, upvotedByMe: r.upvotedByMe || false }));
  }

  async getListingDetail(listingId: string, userId?: string) {
    const listing = await this.prisma.resaleListing.findUnique({
      where: { id: listingId },
      include: { seller: { select: { displayName: true } }, ticket: true, concert: true, ticketType: true }
    });
    if (!listing) throw new errors.ListingNotFoundError();

    const trustProfile = await this.prisma.sellerTrustProfile.findUnique({ where: { userId: listing.sellerId } });
    const comments = await this.prisma.listingComment.findMany({
      where: { listingId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    let upvotedByMe = false;
    if (userId) {
      const upvote = await this.prisma.listingUpvote.findUnique({ where: { listingId_userId: { listingId, userId } } });
      upvotedByMe = !!upvote;
    }

    return { ...listing, sellerTrustTier: trustProfile?.tier || 'NEW', comments, upvotedByMe };
  }

  async findActiveExpiredListings(now: Date) {
    return this.prisma.resaleListing.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } }
    });
  }

  async expireListingAndCloseThreads(listing: any, newQrHash: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.resaleListing.findUnique({ where: { id: listing.id } });
      if (current?.status !== 'ACTIVE') return;

      await tx.resaleListing.update({ where: { id: listing.id }, data: { status: 'EXPIRED' } });
      await tx.ticket.update({ where: { id: listing.ticketId }, data: { status: 'ISSUED', qrTokenHash: newQrHash } });
      await tx.directMessageThread.updateMany({ where: { listingId: listing.id }, data: { isClosed: true } });
    });
  }
}
