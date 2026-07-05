import { Injectable, Inject } from '@nestjs/common';
import { IResaleTransferRepository, RESALE_TRANSFER_REPOSITORY } from '../../domain/ports/resale-transfer-repository.port';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';

@Injectable()
export class ExecutePurchaseUseCase {
  constructor(
    @Inject(RESALE_TRANSFER_REPOSITORY) private readonly transferRepo: IResaleTransferRepository,
    @InjectQueue('compute-seller-trust') private trustQueue: Queue
  ) {}

  async execute(buyerId: string, listingId: string) {
    const newQrHash = randomBytes(32).toString('hex');
    const result = await this.transferRepo.executePurchase(buyerId, listingId, newQrHash);
    
    if (result.sellerIdToUpdate) {
      await this.trustQueue.add('compute-trust', { sellerId: result.sellerIdToUpdate });
    }
    
    return result.transaction;
  }
}
