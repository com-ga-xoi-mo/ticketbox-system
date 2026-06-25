export interface PromotionUsageRollbackPort {
  rollbackUsage(orderId: string, promotionId: string): Promise<void>;
}
