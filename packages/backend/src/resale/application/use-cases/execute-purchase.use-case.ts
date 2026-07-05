import { Injectable, Inject } from '@nestjs/common';
import { IResaleTransferRepository, RESALE_TRANSFER_REPOSITORY } from '../../domain/ports/resale-transfer-repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../domain/ports/event-publisher.port';
import { randomBytes } from 'crypto';

@Injectable()
export class ExecutePurchaseUseCase {
  constructor(
    @Inject(RESALE_TRANSFER_REPOSITORY) private readonly transferRepo: IResaleTransferRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(buyerId: string, listingId: string) {
    const newQrHash = randomBytes(32).toString('hex');
    const result = await this.transferRepo.executePurchase(buyerId, listingId, newQrHash);
    
    if (result.sellerIdToUpdate) {
      await this.eventPublisher.publish('compute-trust', { sellerId: result.sellerIdToUpdate });
    }
    
    return result.transaction;
  }
}
