import { Injectable, Inject, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';

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
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId) {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    if (order.status === 'PENDING_CONFIRM' && order.sellerId === command.userId) {
      throw new ConflictException('CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED');
    }

    if (order.status !== 'RESERVED') {
      throw new ConflictException('CANNOT_CANCEL_IN_CURRENT_STATE');
    }

    const updated = await this.orderRepo.cancelWithRefund(order.id);

    // TODO: Notify the other party

    return updated;
  }
}
