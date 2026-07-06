import { Injectable, Inject } from '@nestjs/common';
import { IResaleTransactionRepository, RESALE_TRANSACTION_REPOSITORY } from '../../domain/ports/resale-transaction-repository.port';

@Injectable()
export class GetMyTransactionsUseCase {
  constructor(@Inject(RESALE_TRANSACTION_REPOSITORY) private readonly txRepo: IResaleTransactionRepository) {}
  async execute(sellerId: string) {
    return this.txRepo.findTransactionsBySeller(sellerId);
  }
}

@Injectable()
export class ProcessPayoutUseCase {
  constructor(@Inject(RESALE_TRANSACTION_REPOSITORY) private readonly txRepo: IResaleTransactionRepository) {}
  async execute(transactionId: string) {
    await this.txRepo.markPayoutProcessed(transactionId);
    return { success: true };
  }
}
