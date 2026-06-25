import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PromotionUsageRollbackPort } from '../ordering/domain/ports/promotion-usage-rollback.port';
import { IPromotionRepository } from './domain/ports/promotion-repository.port';

@Injectable()
export class PromotionUsageRollbackService implements PromotionUsageRollbackPort {
  private readonly logger = new Logger(PromotionUsageRollbackService.name);

  constructor(
    @Inject('IPromotionRepository')
    private readonly promotionRepository: IPromotionRepository,
  ) {}

  async rollbackUsage(orderId: string, promotionId: string): Promise<void> {
    this.logger.log(`Invoked rollbackUsage for order ${orderId}, promotion ${promotionId}`);
    await this.promotionRepository.deleteUsageAndDecrementCount(promotionId, orderId);
    this.logger.log(`Finished rollbackUsage for order ${orderId}, promotion ${promotionId}`);
  }
}
