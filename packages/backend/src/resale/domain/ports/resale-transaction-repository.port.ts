export const RESALE_TRANSACTION_REPOSITORY = Symbol('RESALE_TRANSACTION_REPOSITORY');

export interface IResaleTransactionRepository {
  findTransactionsBySeller(sellerId: string): Promise<any[]>;
  markPayoutProcessed(transactionId: string): Promise<void>;
}
