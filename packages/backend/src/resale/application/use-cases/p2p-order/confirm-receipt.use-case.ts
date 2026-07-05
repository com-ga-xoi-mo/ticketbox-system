import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ExecutePurchaseUseCase } from '../execute-purchase.use-case';

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
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.sellerId !== command.sellerId) {
      throw new ForbiddenException('NOT_ORDER_SELLER');
    }

    if (order.status !== 'PENDING_CONFIRM') {
      throw new ConflictException('INVALID_ORDER_STATE');
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
