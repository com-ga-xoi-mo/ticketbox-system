export const EXPIRED_ORDER_REPOSITORY = Symbol('IExpiredOrderRepository');

export interface IExpiredOrderRepository {
  findExpiredPendingOrderIds(now: Date, limit: number): Promise<string[]>;
}
