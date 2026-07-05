import { ResaleTransaction } from '../resale-transaction.entity';

export const RESALE_TRANSACTION_REPOSITORY = Symbol('RESALE_TRANSACTION_REPOSITORY');

export interface IResaleTransactionRepository {
  findTransactionsBySeller(sellerId: string): Promise<ResaleTransaction[]>;
  markPayoutProcessed(transactionId: string): Promise<void>;
}
