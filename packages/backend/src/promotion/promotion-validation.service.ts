import { Injectable } from '@nestjs/common';
import type { PromotionValidationPort, PromotionValidationResult } from '../ordering/domain/ports/promotion-validation.port';
import { ValidatePromotionUseCase } from './application/use-cases/validate-promotion.use-case';

@Injectable()
export class PromotionValidationService implements PromotionValidationPort {
  constructor(private readonly validatePromotionUseCase: ValidatePromotionUseCase) {}

  async validate(
    code: string,
    userId: string,
    concertId: string,
    ticketTypeIds: string[],
  ): Promise<PromotionValidationResult> {
    const promotion = await this.validatePromotionUseCase.execute({
      code,
      userId,
      concertId,
      ticketTypeIds,
    });

    return {
      valid: true,
      promotionId: promotion.id,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscountVnd: promotion.maxDiscountVnd,
    };
  }
}
