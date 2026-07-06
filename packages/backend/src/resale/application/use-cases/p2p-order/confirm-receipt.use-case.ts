import { Injectable, Inject } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ExecutePurchaseUseCase } from '../execute-purchase.use-case';
import * as errors from '../../../domain/errors';

export interface ConfirmReceiptCommand {
  orderId: string;
  sellerId: string;
}

@Injectable()
export class ConfirmReceiptUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    private readonly executePurchaseUseCase: ExecutePurchaseUseCase,
  ) {}

  async execute(command: ConfirmReceiptCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new errors.OrderNotFoundError();
    }

    if (order.sellerId !== command.sellerId) {
      throw new errors.NotOrderSellerError();
    }

    if (order.status !== 'PENDING_CONFIRM') {
      throw new errors.InvalidOrderStateError();
    }

    // Call execute transfer logic
    await this.executePurchaseUseCase.execute(order.buyerId, order.listingId);

    const updated = await this.orderRepo.updateStatus(order.id, 'COMPLETED', {
      completedAt: new Date()
    });

    // TODO: Notify buyer and seller

    return updated;
  }
}
