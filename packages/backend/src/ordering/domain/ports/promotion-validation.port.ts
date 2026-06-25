import { PromotionDiscountType } from '../../../promotion/domain/promotion-discount-type.enum';

export interface PromotionValidationResult {
  valid: boolean;
  promotionId?: string;
  discountType?: PromotionDiscountType;
  discountValue?: number;
  maxDiscountVnd?: number | null;
  message?: string;
}

export interface PromotionValidationPort {
  validate(
    code: string,
    userId: string,
    concertId: string,
    ticketTypeIds: string[],
  ): Promise<PromotionValidationResult>;
}
