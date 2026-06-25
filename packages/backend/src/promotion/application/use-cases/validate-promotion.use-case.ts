import {
  PromoCodeExpiredError,
  PromoCodeInactiveError,
  PromoCodeNotFoundError,
  PromoCodeNotYetValidError,
  PromoNotApplicableError,
  PromoUsageLimitExceededError,
  PromoUserLimitExceededError,
} from '../../domain/errors';
import type { IPromotionRepository } from '../../domain/ports/promotion-repository.port';
import type { Promotion } from '../../domain/promotion.entity';

export interface ValidatePromotionCommand {
  code: string;
  userId: string;
  concertId: string;
  ticketTypeIds: string[];
  now?: Date;
}

export class ValidatePromotionUseCase {
  constructor(private readonly promotionRepository: IPromotionRepository) {}

  async execute(command: ValidatePromotionCommand): Promise<Promotion> {
    const promotion = await this.promotionRepository.findByCode(command.code);

    if (!promotion) {
      throw new PromoCodeNotFoundError();
    }

    if (!promotion.isActive) {
      throw new PromoCodeInactiveError();
    }

    const now = command.now ?? new Date();

    if (promotion.validFrom && now < promotion.validFrom) {
      throw new PromoCodeNotYetValidError();
    }

    if (promotion.validUntil && now > promotion.validUntil) {
      throw new PromoCodeExpiredError();
    }

    // Check scope applicability
    if (promotion.applicableEventIds.length > 0) {
      if (!promotion.applicableEventIds.includes(command.concertId)) {
        throw new PromoNotApplicableError();
      }
    }

    if (promotion.applicableTicketTypeIds.length > 0) {
      const hasApplicableTicket = command.ticketTypeIds.some((id) =>
        promotion.applicableTicketTypeIds.includes(id),
      );
      if (!hasApplicableTicket) {
        throw new PromoNotApplicableError();
      }
    }

    // Check usage limits
    if (promotion.maxUsageCount !== null) {
      const globalUsages = await this.promotionRepository.countUsages(promotion.id);
      if (globalUsages >= promotion.maxUsageCount) {
        throw new PromoUsageLimitExceededError();
      }
    }

    if (promotion.maxUsagePerUser !== null) {
      const userUsages = await this.promotionRepository.countUserUsages(
        promotion.id,
        command.userId,
      );
      if (userUsages >= promotion.maxUsagePerUser) {
        throw new PromoUserLimitExceededError();
      }
    }

    return promotion;
  }
}
