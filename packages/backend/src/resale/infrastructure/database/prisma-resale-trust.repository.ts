import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { IResaleTrustRepository } from '../../domain/ports/resale-trust-repository.port';
import { ResaleTrustProfile } from '../../domain/resale-trust.entity';
import * as errors from '../../domain/errors';

@Injectable()
export class PrismaResaleTrustRepository implements IResaleTrustRepository {
  constructor(private readonly db: PrismaService) {}

  async getSellerProfile(userId: string): Promise<ResaleTrustProfile | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, createdAt: true }
    });

    if (!user) throw new errors.ResaleDomainError('Seller not found', 'SELLER_NOT_FOUND');

    const trustProfile = await this.db.sellerTrustProfile.findUnique({ where: { userId } });
    const activeListings = await this.db.resaleListing.findMany({
      where: { sellerId: userId, status: 'ACTIVE' },
      include: { concert: true, ticketType: true }
    });

    return {
      userId: user.id,
      displayName: user.displayName,
      memberSince: user.createdAt,
      tier: trustProfile?.tier || 'NEW',
      completedSalesCount: trustProfile?.completedSalesCount || 0,
      activeListings
    };
  }

  async computeTrustScore(sellerId: string, event?: string) {
    const completedSales = await this.db.resaleTransaction.count({ where: { sellerId } });

    const threads = await this.db.directMessageThread.findMany({
      where: { sellerId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    let totalResponseTime = 0;
    let respondedThreadsCount = 0;

    for (const t of threads) {
      const buyerMsg = t.messages.find(m => m.senderId === t.buyerId);
      const sellerReply = buyerMsg ? t.messages.find(m => m.senderId === t.sellerId && m.createdAt > buyerMsg.createdAt) : null;
      if (buyerMsg && sellerReply) {
        totalResponseTime += (sellerReply.createdAt.getTime() - buyerMsg.createdAt.getTime()) / 60000;
        respondedThreadsCount++;
      }
    }

    const avgResponseTimeMinutes = respondedThreadsCount > 0 ? totalResponseTime / respondedThreadsCount : null;

    const totalListings = await this.db.resaleListing.count({ where: { sellerId } });
    const expiredListings = await this.db.resaleListing.count({ where: { sellerId, status: 'EXPIRED' } });
    const noShowRate = totalListings > 0 ? expiredListings / totalListings : 0;

    let trustScore = 50;
    if (completedSales > 0) {
      trustScore += completedSales * 5;
      if (avgResponseTimeMinutes !== null) {
        if (avgResponseTimeMinutes < 60) trustScore += 20;
        else if (avgResponseTimeMinutes < 1440) trustScore += 10;
        else trustScore -= 10;
      }
      trustScore -= (noShowRate * 100);
    }
    
    if (event === 'dispute_loss') {
      trustScore -= 30; // Heavy penalty for dispute loss
    }
    
    trustScore = Math.max(0, Math.min(100, trustScore));

    let tier: 'NEW' | 'TRUSTED' | 'HIGHLY_TRUSTED' | 'TOP_SELLER' = 'NEW';
    if (completedSales >= 10 && trustScore >= 90) tier = 'TOP_SELLER';
    else if (completedSales >= 5 && trustScore >= 80) tier = 'HIGHLY_TRUSTED';
    else if (completedSales >= 1 && trustScore >= 60) tier = 'TRUSTED';

    await this.db.sellerTrustProfile.upsert({
      where: { userId: sellerId },
      update: {
        trustScore: Math.round(trustScore),
        completedSalesCount: completedSales,
        avgResponseTimeMinutes: avgResponseTimeMinutes ? Math.round(avgResponseTimeMinutes) : null,
        noShowRate,
        tier,
        lastComputedAt: new Date()
      },
      create: {
        userId: sellerId,
        trustScore: Math.round(trustScore),
        completedSalesCount: completedSales,
        avgResponseTimeMinutes: avgResponseTimeMinutes ? Math.round(avgResponseTimeMinutes) : null,
        noShowRate,
        tier,
        lastComputedAt: new Date()
      }
    });
  }
}
