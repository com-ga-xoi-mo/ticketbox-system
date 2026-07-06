import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IResaleOrderRepository, RESALE_ORDER_REPOSITORY } from '../../../domain/ports/p2p-order/resale-order-repository.port';

export interface GetP2POrderCommand {
  orderId: string;
  userId: string;
}

@Injectable()
export class GetP2POrderUseCase {
  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
  ) {}

  async execute(command: GetP2POrderCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new BadRequestException('ORDER_NOT_FOUND');
    }

    if (order.buyerId !== command.userId && order.sellerId !== command.userId) {
      throw new ForbiddenException('NOT_ORDER_PARTICIPANT');
    }

    return order;
  }
}
