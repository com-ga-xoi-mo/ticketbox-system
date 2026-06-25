import type { Promotion } from '../promotion.entity';

export interface IPromotionRepository {
  findByCode(code: string): Promise<Promotion | null>;
  countUsages(promotionId: string): Promise<number>;
  countUserUsages(promotionId: string, userId: string): Promise<number>;
  createUsage(promotionId: string, userId: string, orderId: string, tx?: any): Promise<void>;
}
