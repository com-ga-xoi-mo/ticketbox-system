import { Injectable, Inject } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';
import * as errors from '../../../domain/errors';

export interface CancelP2POrderCommand {
  orderId: string;
  userId: string;
}

@Injectable()
export class CancelP2POrderUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
  ) {}

  async execute(command: CancelP2POrderCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new errors.OrderNotFoundError();
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId) {
      throw new errors.NotOrderParticipantError();
    }

    if (order.status === 'PENDING_CONFIRM' && order.sellerId === command.userId) {
      throw new errors.CannotCancelAfterPaymentConfirmedError();
    }

    if (order.status !== 'RESERVED') {
      throw new errors.CannotCancelInCurrentStateError();
    }

    const updated = await this.orderRepo.cancelWithRefund(order.id);

    // TODO: Notify the other party

    return updated;
  }
}
