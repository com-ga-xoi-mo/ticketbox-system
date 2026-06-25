import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { Promotion } from '../../domain/promotion.entity';
import { PromotionDiscountType } from '../../domain/promotion-discount-type.enum';
import type { IPromotionRepository } from '../../domain/ports/promotion-repository.port';

@Injectable()
export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<Promotion | null> {
    const raw = await this.prisma.promotion.findUnique({
      where: { code: code.toLowerCase() },
    });
    
    // Fallback if citext is not used and the db is case sensitive
    const result = raw ?? await this.prisma.promotion.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (!result) return null;

    return new Promotion({
      id: result.id,
      code: result.code,
      discountType: result.discountType as PromotionDiscountType,
      discountValue: result.discountValue,
      maxDiscountVnd: result.maxDiscountVnd,
      maxUsageCount: result.maxUsageCount,
      maxUsagePerUser: result.maxUsagePerUser,
      validFrom: result.validFrom,
      validUntil: result.validUntil,
      isActive: result.isActive,
      applicableEventIds: result.applicableEventIds,
      applicableCategoryIds: result.applicableCategoryIds,
      applicableTicketTypeIds: result.applicableTicketTypeIds,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  }

  async countUsages(promotionId: string): Promise<number> {
    return this.prisma.promotionUsage.count({
      where: { promotionId },
    });
  }

  async countUserUsages(promotionId: string, userId: string): Promise<number> {
    return this.prisma.promotionUsage.count({
      where: { promotionId, userId },
    });
  }

  async createUsage(promotionId: string, userId: string, orderId: string, tx?: any): Promise<void> {
    const client = tx ?? this.prisma;
    await client.promotionUsage.create({
      data: {
        promotionId,
        userId,
        orderId,
      },
    });
  }

  async deleteUsageAndDecrementCount(promotionId: string, orderId: string, tx?: any): Promise<void> {
    const client = tx ?? this.prisma;
    await client.$transaction(async (prismaTx: any) => {
      // 1. Delete usage
      const deleted = await prismaTx.promotionUsage.deleteMany({
        where: { promotionId, orderId },
      });

      // 2. Decrement if it was actually deleted
      if (deleted.count > 0) {
        await prismaTx.promotion.update({
          where: { id: promotionId },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });
  }
}
