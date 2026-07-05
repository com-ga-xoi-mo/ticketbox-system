import { Injectable, Inject } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ExecutePurchaseUseCase } from '../execute-purchase.use-case';
import { IEventPublisher, EVENT_PUBLISHER } from '../../../domain/ports/event-publisher.port';
import * as errors from '../../../domain/errors';

export interface ResolveDisputeCommand {
  orderId: string;
  adminId: string;
  action: 'complete' | 'cancel';
  resolutionNote: string;
}

@Injectable()
export class ResolveDisputeUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    private readonly executePurchaseUseCase: ExecutePurchaseUseCase,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(command: ResolveDisputeCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new errors.OrderNotFoundError();
    }

    if (order.status !== 'IN_DISPUTE') {
      throw new errors.InvalidOrderStateError();
    }

    if (command.action === 'complete') {
      // Buyer wins - execute transfer
      await this.executePurchaseUseCase.execute(order.buyerId, order.listingId);

      const updated = await this.orderRepo.resolveDispute(order.id, 'complete', command.resolutionNote);

      // Penalize seller
      await this.eventPublisher.publish('compute-trust', { 
        sellerId: order.sellerId,
        event: 'dispute_loss'
      });

      return updated;

    } else {
      // Seller wins - cancel order
      const updated = await this.orderRepo.resolveDispute(order.id, 'cancel', command.resolutionNote);
      return updated;
    }
  }
}
